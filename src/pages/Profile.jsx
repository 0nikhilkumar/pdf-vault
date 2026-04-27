import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Mail, ShieldUser, User } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";

const Profile = () => {
  const { user, selectedSubscriptionPlan, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    setFormData({
      username: user?.username || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    });
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSaving(true);
    try {
      const response = await updateProfile({
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });

      if (!response.success) {
        toast({
          title: response.message || "Profile update failed",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: response.message || "Profile updated successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const expiryDate = user?.hasSubscription
    ? user?.subscriptionExpiryDate || user?.subscription?.expiryDate || null
    : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 md:p-8 lg:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Profile
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-2">
                Your account and subscription details.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/subscription/buy")}
              className="w-full md:w-auto"
            >
              Manage Subscription
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-3 md:space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 md:h-12 w-10 md:w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <User className="h-5 md:h-6 w-5 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base md:text-lg font-semibold text-foreground truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {user?.role || "user"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 flex-shrink-0">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <span className="text-foreground truncate">
                    {user?.email || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 flex-shrink-0">
                    <ShieldUser className="h-4 w-4" /> Subscription
                  </span>
                  <span className="text-foreground">
                    {user?.hasSubscription
                      ? selectedSubscriptionPlan?.name || "Active"
                      : "Free"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 flex-shrink-0">
                    <CalendarDays className="h-4 w-4" /> Expiry
                  </span>
                  <span className="text-foreground">
                    {formatDate(expiryDate, "Not available")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h2 className="text-base md:text-lg font-semibold text-foreground mb-2 md:mb-3">
                Edit Profile
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                Update your username and name. Email stays read-only.
              </p>

              <form className="space-y-3 md:space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="username" className="text-xs md:text-sm">
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter username"
                    autoComplete="username"
                    className="h-9 md:h-10 text-xs md:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="firstName" className="text-xs md:text-sm">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className="h-9 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="lastName" className="text-xs md:text-sm">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className="h-9 md:h-10 text-xs md:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="email" className="text-xs md:text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    readOnly
                    disabled
                    className="h-9 md:h-10 text-xs md:text-sm bg-muted/50"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs md:text-sm h-9 md:h-10"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-4 md:mt-6 rounded-xl border border-border bg-card p-4 md:p-5">
            <h2 className="text-base md:text-lg font-semibold text-foreground mb-2 md:mb-3">
              Account Access
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
              Your library and upload access depend on your subscription status.
            </p>
            <div className="space-y-2 text-xs md:text-sm">
              <div className="rounded-lg bg-muted/50 px-3 md:px-4 py-2 md:py-3">
                PDF Library: {user?.hasSubscription ? "Unlocked" : "Locked"}
              </div>
              <div className="rounded-lg bg-muted/50 px-3 md:px-4 py-2 md:py-3">
                Upload Access: {user?.hasSubscription ? "Unlocked" : "Locked"}
              </div>
              <div className="rounded-lg bg-muted/50 px-3 md:px-4 py-2 md:py-3">
                Profile: Always available
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Profile;
