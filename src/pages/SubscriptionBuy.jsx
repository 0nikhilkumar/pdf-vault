import { motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Lock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const RAZORPAY_BASE_PATH = `${API_BASE_URL}/users/razorpay`;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const getCheckoutRedirectUrl = (payload) =>
  payload?.url || payload?.checkoutUrl || payload?.short_url || null;

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const getVerificationCandidates = (checkoutPayload) => {
  const customCandidates = [
    checkoutPayload?.verify_url,
    checkoutPayload?.verifyUrl,
    checkoutPayload?.verification_url,
    checkoutPayload?.verificationUrl,
    checkoutPayload?.callback_url,
    checkoutPayload?.callbackUrl,
  ].filter(Boolean);

  return [...customCandidates, `${RAZORPAY_BASE_PATH}/verify-payment`];
};

const verifyPaymentOnBackend = async ({
  checkoutPayload,
  paymentPayload,
  plan,
  accessToken,
  user,
}) => {
  const payload = {
    razorpay_payment_id: paymentPayload?.razorpay_payment_id,
    razorpay_order_id: paymentPayload?.razorpay_order_id,
    razorpay_signature: paymentPayload?.razorpay_signature,
    paymentId: paymentPayload?.razorpay_payment_id,
    orderId: paymentPayload?.razorpay_order_id,
    signature: paymentPayload?.razorpay_signature,
    planId: plan?.id,
    subscriptionPlanId: plan?.id,
    priceId: plan?.priceId,
    amount: checkoutPayload?.amount,
    currency: checkoutPayload?.currency,
    userId: user?.id,
  };

  const candidates = getVerificationCandidates(checkoutPayload);
  let lastError = "Unable to verify payment";

  for (const endpoint of candidates) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(response);
      if (response.ok) {
        return data || { verified: true };
      }

      if (response.status === 404 || response.status === 405) {
        continue;
      }

      lastError =
        data?.message || `Verification failed (HTTP ${response.status})`;
      throw new Error(lastError);
    } catch (error) {
      lastError = error?.message || lastError;
    }
  }

  throw new Error(lastError);
};

const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const SubscriptionBuy = () => {
  const {
    user,
    accessToken,
    subscriptionPlans,
    subscriptionPlan,
    isLoadingSubscriptionPlans,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState(
    subscriptionPlan?.id || subscriptionPlans[0]?.id || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);

  useEffect(() => {
    if (!subscriptionPlans.length) return;
    setSelectedPlanId((prev) => {
      if (subscriptionPlans.some((plan) => plan.id === prev)) return prev;
      return subscriptionPlan?.id || subscriptionPlans[0]?.id || "";
    });
  }, [subscriptionPlan?.id, subscriptionPlans]);

  const currentPlanId =
    subscriptionData?.planId ||
    user?.subscriptionPlanId ||
    subscriptionPlan?.id;

  const selectedPlan =
    subscriptionPlans.find((plan) => plan.id === selectedPlanId) ||
    subscriptionPlans[0] ||
    null;

  const currentPlanLabel =
    subscriptionPlan?.priceLabel || selectedPlan?.priceLabel || "-";

  const subscriptionExpiry = useMemo(() => {
    return (
      subscriptionData?.expiryDate ||
      subscriptionData?.expiresAt ||
      user?.subscriptionExpiryDate ||
      user?.subscription?.expiryDate ||
      user?.subscription?.expiresAt ||
      user?.subscription?.endsAt ||
      null
    );
  }, [subscriptionData, user]);

  const upcomingPlans = useMemo(() => {
    const plansFromState =
      subscriptionData?.scheduledPlans ||
      user?.subscription?.scheduledPlans ||
      user?.scheduledPlans ||
      [];

    if (!Array.isArray(plansFromState)) return [];

    return plansFromState.filter(Boolean).map((entry) => {
      const planType = String(entry.subscriptionType || "").toLowerCase();
      const matchedPlan =
        subscriptionPlans.find((plan) => plan.id === planType) ||
        subscriptionPlans.find((plan) => plan.planType === planType);

      return {
        id: entry.id || `${planType}-${entry.startDate || entry.expiryDate}`,
        name: matchedPlan?.name || entry.subscriptionType || "Scheduled plan",
        startDate: entry.startDate,
        expiryDate: entry.expiryDate,
        purchaseDate: entry.purchaseDate,
      };
    });
  }, [subscriptionData, subscriptionPlans, user]);

  const handlePurchase = (plan) => {
    if (!user?.id) {
      navigate("/login");
      return;
    }

    const createCheckoutSession = async () => {
      try {
        setIsSubmitting(true);

        if (!accessToken) {
          throw new Error("Please log in again to continue checkout");
        }
        if (!plan?.id && !plan?.priceId) {
          throw new Error("Selected plan information is missing");
        }
        const gatewayPlanId = String(plan?.priceId || "").trim();

        const response = await fetch(
          `${RAZORPAY_BASE_PATH}/create-checkout-session`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              ...(gatewayPlanId ? { priceId: gatewayPlanId } : {}),
              planId: plan?.id || gatewayPlanId,
              subscriptionPlanId: plan.id,
            }),
          },
        );

        const raw = await response.text();
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }
        if (!response.ok) {
          throw new Error(
            data?.message ||
              raw ||
              `Unable to start payment checkout (HTTP ${response.status})`,
          );
        }

        const orderId = data?.order_id || data?.orderId || data?.order?.id;
        const subscriptionId =
          data?.subscription_id ||
          data?.subscriptionId ||
          data?.subscription?.id;

        const redirectUrl = getCheckoutRedirectUrl(data);
        const canUseEmbeddedCheckout = Boolean(orderId || subscriptionId);
        if (redirectUrl && !canUseEmbeddedCheckout) {
          window.location.href = redirectUrl;
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error(
            "Razorpay checkout script failed to load. Please refresh and try again.",
          );
        }

        if (!orderId && !subscriptionId) {
          throw new Error(
            data?.message ||
              "Checkout session created but no redirect URL/order/subscription details were returned.",
          );
        }

        const key = data?.key || data?.razorpayKeyId || "";
        if (!key) {
          throw new Error(
            "Missing Razorpay key from backend. Contact support.",
          );
        }

        const amount = Number(data?.amount ?? data?.order?.amount ?? 0);
        const options = {
          key,
          amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
          currency: data?.currency || data?.order?.currency || "INR",
          method: data?.method || {},
          name: "Export Import",
          description: `${plan.name} payment`,
          order_id: orderId,
          subscription_id: subscriptionId,
          callback_url: data?.callback_url || data?.callbackUrl,
          prefill: {
            name: user?.name || user?.username || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          theme: {
            color: "#0ea5e9",
          },
          handler: async (paymentPayload) => {
            try {
              const verification = await verifyPaymentOnBackend({
                checkoutPayload: data,
                paymentPayload,
                plan,
                accessToken,
                user,
              });

              if (verification?.subscription || verification?.payment) {
                setSubscriptionData(
                  verification?.subscription || verification?.payment,
                );
              }

              toast({
                title: "Payment verified",
                description:
                  verification?.message || "Payment verified successfully",
              });

              navigate("/subscription/success", { replace: true });
            } catch (error) {
              toast({
                title: "Verification failed",
                description:
                  error?.message || "Payment captured but verification failed",
                variant: "destructive",
              });
            }
          },
          modal: {
            ondismiss: () => {
              toast({
                title: "Payment cancelled",
                description: "You can retry the payment anytime.",
                variant: "destructive",
              });
            },
          },
        };

        const checkout = new window.Razorpay(options);
        checkout.on("payment.failed", (failureResponse) => {
          const errorMessage =
            failureResponse?.error?.description ||
            failureResponse?.error?.reason ||
            "Payment failed. Please try again.";

          toast({
            title: "Payment failed",
            description: errorMessage,
            variant: "destructive",
          });
        });
        checkout.open();
      } catch (error) {
        toast({
          title: "Checkout failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    createCheckoutSession();
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 md:p-10"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Subscription
              </h1>
              <p className="text-muted-foreground mt-2">
                {user?.hasSubscription
                  ? "Extend your current or upcoming plan."
                  : "Choose a plan to unlock PDF reading and uploading."}
              </p>
            </div>
            <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              Selected: {selectedPlan?.priceLabel || "-"}
            </div>
          </div>

          {user?.hasSubscription && (
            <div className="rounded-xl border border-border bg-card p-5 mb-8 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Current plan
                </span>
                <span className="text-sm font-medium text-foreground">
                  {currentPlanLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Expiry date
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(subscriptionExpiry, "Not available")}
                </span>
              </div>

              {upcomingPlans.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Upcoming plan
                  </p>
                  <div className="space-y-2">
                    {upcomingPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-lg border border-border/70 bg-muted/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {plan.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Starts: {formatDate(plan.startDate)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Valid till: {formatDate(plan.expiryDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {isLoadingSubscriptionPlans && (
              <div className="rounded-xl border border-border p-6 bg-card text-sm text-muted-foreground md:col-span-2">
                Loading available plans...
              </div>
            )}

            {!isLoadingSubscriptionPlans && subscriptionPlans.length === 0 && (
              <div className="rounded-xl border border-border p-6 bg-card text-sm text-muted-foreground md:col-span-2">
                No subscription plans available right now.
              </div>
            )}

            {!isLoadingSubscriptionPlans &&
              subscriptionPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isCurrentPlan =
                  currentPlanId === plan.id ||
                  String(currentPlanId || "").toLowerCase() === plan.planType;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-6 bg-card transition-colors ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 text-foreground font-semibold">
                        <CreditCard className="h-5 w-5 text-primary" />
                        {plan.name}
                      </div>
                      {isSelected && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="text-3xl font-bold text-foreground mb-4">
                      {plan.priceLabel}
                    </p>

                    <div className="space-y-2 mb-5">
                      {plan.features.map((feature) => (
                        <div
                          key={`${plan.id}-${feature}`}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          {feature.toLowerCase().includes("disabled") ? (
                            <Lock className="h-4 w-4 text-primary" />
                          ) : feature.toLowerCase().includes("no access") ? (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-accent" />
                          )}
                          {feature}
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full h-11"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        handlePurchase(plan);
                      }}
                      disabled={isSubmitting}
                    >
                      {user?.hasSubscription && isCurrentPlan ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Redirecting..." : "Extend"}
                        </>
                      ) : isSubmitting && isSelected ? (
                        "Redirecting..."
                      ) : (
                        "Buy"
                      )}
                    </Button>
                  </div>
                );
              })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/dashboard")}
              className="h-11 px-8 font-semibold"
            >
              Go To Library
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => navigate("/subscription/cancel")}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default SubscriptionBuy;
