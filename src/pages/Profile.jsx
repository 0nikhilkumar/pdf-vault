import { motion } from "framer-motion";
import { CalendarDays, Mail, ShieldUser, User } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";

const Profile = () => {
  const { user, selectedSubscriptionPlan } = useAuth();
  const navigate = useNavigate();

  const expiryDate = user?.hasSubscription
    ? user?.subscriptionExpiryDate || user?.subscription?.expiryDate || null
    : null;

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
                Profile
              </h1>
              <p className="text-muted-foreground mt-2">
                Your account and subscription details.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/subscription/buy")}
            >
              Manage Subscription
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.role || "user"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <span className="text-foreground">{user?.email || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <ShieldUser className="h-4 w-4" /> Subscription
                  </span>
                  <span className="text-foreground">
                    {user?.hasSubscription
                      ? selectedSubscriptionPlan?.name || "Active"
                      : "Free"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Expiry
                  </span>
                  <span className="text-foreground">
                    {formatDate(expiryDate, "Not available")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Account Access
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Your library and upload access depend on your subscription
                status.
              </p>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  PDF Library: {user?.hasSubscription ? "Unlocked" : "Locked"}
                </div>
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  Upload Access: {user?.hasSubscription ? "Unlocked" : "Locked"}
                </div>
                <div className="rounded-lg bg-muted/50 px-4 py-3">
                  Profile: Always available
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Profile;
