import { motion } from "framer-motion";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SUCCESS_REFRESH_KEY = "docvault.subscription.successRefreshed";

const SubscriptionSuccess = () => {
  const { user, accessToken, selectedSubscriptionPlan, subscriptionPlans } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const activePlan = selectedSubscriptionPlan || subscriptionPlans[0];

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const shouldAutoRefresh = Boolean(sessionId);
    if (!shouldAutoRefresh) {
      setIsVerifying(false);
      return;
    }

    const refreshKey = `${SUCCESS_REFRESH_KEY}:${sessionId}`;
    const alreadyRefreshed = sessionStorage.getItem(refreshKey) === "true";

    if (!alreadyRefreshed) {
      sessionStorage.setItem(refreshKey, "true");
      window.location.reload();
      return;
    }

    const verifySubscription = async () => {
      if (!user?.id) {
        setIsVerifying(false);
        return;
      }

      if (!accessToken) {
        toast({
          title: "Verification failed",
          description: "Session expired. Please log in again.",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      try {
        const sessionId = searchParams.get("session_id");
        const endpoint = new URL(
          "http://localhost:3000/api/users/razorpay/subscription",
        );
        if (sessionId) {
          endpoint.searchParams.set("session_id", sessionId);
        }

        const response = await fetch(endpoint.toString(), {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Unable to verify subscription");
        }

        const subscription = data?.subscription || data;
        if (subscription?.active || subscription?.status === "active") {
          // Subscription verified on backend, no need for local activation
          toast({
            title: "Subscription activated",
            description: "Your subscription is now active!",
          });
        } else {
          toast({
            title: "Subscription not active",
            description: "Payment is pending confirmation from Razorpay.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Verification failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [accessToken, searchParams, toast, user]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <CheckCircle2 className="h-14 w-14 text-accent mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Payment Successful
          </h1>
          <p className="text-muted-foreground mb-6">
            Your {activePlan.name} ({activePlan.priceLabel}) subscription is now
            active.
          </p>
          {isVerifying && (
            <p className="text-sm text-muted-foreground mb-4">
              Verifying payment status...
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-8">
            <div className="rounded-lg border border-border p-4 bg-card flex items-center gap-2 justify-center">
              <FileText className="h-4 w-4 text-primary" />
              Read PDFs in secure mode
            </div>
            <div className="rounded-lg border border-border p-4 bg-card flex items-center gap-2 justify-center">
              <Upload className="h-4 w-4 text-primary" />
              Upload PDFs enabled
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={() => navigate("/dashboard")}
              className="h-11 px-6"
            >
              Go To Library
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/upload")}
              className="h-11 px-6"
            >
              Upload PDF
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default SubscriptionSuccess;
