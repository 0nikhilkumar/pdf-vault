import { motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Lock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const SubscriptionBuy = () => {
  const { user, accessToken, subscriptionPlans, subscriptionPlan } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState(subscriptionPlans[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);

  const currentPlanId =
    subscriptionData?.planId ||
    user?.subscriptionPlanId ||
    subscriptionPlan?.id;

  const selectedPlan =
    subscriptionPlans.find((plan) => plan.id === selectedPlanId) ||
    subscriptionPlans[0];

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
      const matchedPlan = subscriptionPlans.find(
        (plan) => plan.id === planType,
      );

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
        if (!plan?.priceId) {
          throw new Error("Selected plan is missing Stripe price ID");
        }

        const response = await fetch(
          `${API_BASE_URL}/users/stripe/create-checkout-session`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              priceId: plan.priceId,
              planId: plan.id,
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
        if (!response.ok || !data?.url) {
          throw new Error(
            data?.message ||
              raw ||
              `Unable to start Stripe checkout (HTTP ${response.status})`,
          );
        }

        window.location.href = data.url;
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
              Selected: {selectedPlan.priceLabel}
            </div>
          </div>

          {user?.hasSubscription && (
            <div className="rounded-xl border border-border bg-card p-5 mb-8 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Current plan
                </span>
                <span className="text-sm font-medium text-foreground">
                  {subscriptionPlan.priceLabel}
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
            {subscriptionPlans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;

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
                    {user?.hasSubscription ? (
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
