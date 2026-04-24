import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const AdminUsers = () => {
  const location = useLocation();
  const isSubscribedPage = location.pathname === "/admin/subscribed-users";
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState("");
  const [selectedUserSummary, setSelectedUserSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [action, setAction] = useState("extend");
  const [subscriptionType, setSubscriptionType] = useState("basic");
  const [paymentType, setPaymentType] = useState("manual");
  const [remark, setRemark] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);

        const [allUsersResponse, subscribedUsersResponse] = await Promise.all([
          fetch(buildApiUrl("/admin/all-users"), {
            method: "GET",
            credentials: "include",
            headers: withAuthHeader(accessToken),
          }),
          fetch(buildApiUrl("/admin/subscribed-users"), {
            method: "GET",
            credentials: "include",
            headers: withAuthHeader(accessToken),
          }),
        ]);

        const [allUsersPayload, subscribedUsersPayload] = await Promise.all([
          parseJsonSafely(allUsersResponse),
          parseJsonSafely(subscribedUsersResponse),
        ]);

        if (!isMounted) return;

        if (allUsersResponse.ok) {
          setUsers(
            Array.isArray(allUsersPayload?.users) ? allUsersPayload.users : [],
          );
        }

        if (subscribedUsersResponse.ok) {
          setSubscribedUsers(
            Array.isArray(subscribedUsersPayload?.subscribedUsers)
              ? subscribedUsersPayload.subscribedUsers
              : [],
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const subscribedIdSet = useMemo(
    () => new Set(subscribedUsers.map((entry) => String(entry?._id))),
    [subscribedUsers],
  );

  const handleSelectUser = async (userId) => {
    if (!userId) return;

    if (expandedUserId === userId) {
      setExpandedUserId("");
      setSelectedUserSummary(null);
      return;
    }

    setExpandedUserId(userId);
    setSelectedUserSummary(null);
    setIsLoadingSummary(true);

    try {
      const response = await fetch(
        buildApiUrl(`/admin/${encodeURIComponent(userId)}/with-subscriptions`),
        {
          method: "GET",
          credentials: "include",
          headers: withAuthHeader(accessToken),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load user summary");
      }

      setSelectedUserSummary(payload?.users || null);

      const nextSummary = payload?.users || null;
      setSubscriptionType(
        String(
          nextSummary?.subscriptionType ||
            nextSummary?.upcomingSubscription?.subscriptionType ||
            "basic",
        ).toLowerCase(),
      );
    } catch {
      setSelectedUserSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleManualAction = async () => {
    if (!expandedUserId) {
      toast({ title: "Select a user first" });
      return;
    }

    const subscriptionId =
      selectedUserSummary?.subscriptionId ||
      selectedUserSummary?._id ||
      selectedUserSummary?.activeSubscription?._id ||
      undefined;

    try {
      setIsSubmittingAction(true);

      const response = await fetch(
        buildApiUrl("/subscriptions/manual-action"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            ...withAuthHeader(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: expandedUserId,
            action,
            subscriptionType,
            paymentType,
            remark: remark.trim(),
            ...(subscriptionId ? { subscriptionId } : {}),
          }),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Manual subscription action failed",
        );
      }

      const updatedSubscription = payload?.subscription || null;
      if (updatedSubscription) {
        setSelectedUserSummary((prev) => ({
          ...(prev || {}),
          subscriptionId: updatedSubscription._id || prev?.subscriptionId,
          subscriptionStatus:
            updatedSubscription.status || prev?.subscriptionStatus,
          subscriptionType:
            updatedSubscription.subscriptionType || prev?.subscriptionType,
          startDate: updatedSubscription.startDate || prev?.startDate,
          purchaseDate: updatedSubscription.purchaseDate || prev?.purchaseDate,
          expiryDate: updatedSubscription.expiryDate || prev?.expiryDate,
          paymentType: updatedSubscription.paymentType || prev?.paymentType,
          adminRemark: updatedSubscription.adminRemark || prev?.adminRemark,
          appliedDurationDays:
            updatedSubscription.appliedDurationDays ??
            prev?.appliedDurationDays,
          lastAdminAction:
            updatedSubscription.lastAdminAction || prev?.lastAdminAction,
        }));

        const nextStatus = String(
          updatedSubscription.status || "",
        ).toLowerCase();
        const isActive = nextStatus === "active" || nextStatus === "subscribed";

        if (isActive) {
          setSubscribedUsers((prev) => {
            const exists = prev.some(
              (entry) => String(entry?._id) === String(expandedUserId),
            );
            return exists ? prev : [{ _id: expandedUserId }, ...prev];
          });
        } else {
          setSubscribedUsers((prev) =>
            prev.filter(
              (entry) => String(entry?._id) !== String(expandedUserId),
            ),
          );
        }
      }

      toast({ title: payload?.message || "Subscription updated successfully" });
    } catch (error) {
      toast({
        title: error?.message || "Unable to process manual action",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const visibleUsers = useMemo(() => {
    if (!isSubscribedPage) return users;
    const subscribedIdSet = new Set(
      subscribedUsers.map((entry) => String(entry?._id)),
    );
    return users.filter((entry) => subscribedIdSet.has(String(entry?._id)));
  }, [isSubscribedPage, subscribedUsers, users]);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {isSubscribedPage ? "Subscribed Users" : "Registered Users"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSubscribedPage
            ? "Click a subscribed user to show or hide subscription details"
            : "All registered normal users"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="glass rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Total Users
          </p>
          <p className="text-2xl font-bold text-foreground">
            {visibleUsers.length}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Subscribed Users
          </p>
          <p className="text-2xl font-bold text-foreground">
            {subscribedUsers.length}
          </p>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>User</span>
          <span>Email</span>
          <span>Joined</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-border">
          {isLoadingUsers && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              Loading users...
            </div>
          )}
          {!isLoadingUsers && users.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No users found
            </div>
          )}
          {!isLoadingUsers && isSubscribedPage && visibleUsers.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No subscribed users found
            </div>
          )}
          {visibleUsers.map((entry, index) => (
            <motion.div
              key={entry._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors ${
                isSubscribedPage ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (isSubscribedPage) {
                  handleSelectUser(entry._id);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {(entry.name || entry.username || "U").charAt(0)}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {entry.name || entry.username || "User"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {entry.email}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDate(entry.createdAt || Date.now())}
              </span>
              <div>
                {subscribedIdSet.has(String(entry._id)) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                    <Crown className="h-3 w-3" /> Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    <User className="h-3 w-3" /> Free
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {isSubscribedPage && (
        <div className="glass rounded-xl mt-6 p-6">
          <h2 className="font-semibold text-foreground mb-3">
            Subscription Summary
          </h2>
          {!expandedUserId && (
            <p className="text-sm text-muted-foreground">
              Click any subscribed user row to show details
            </p>
          )}
          {isLoadingSummary && (
            <p className="text-sm text-muted-foreground">Loading summary...</p>
          )}
          {!isLoadingSummary && expandedUserId && !selectedUserSummary && (
            <p className="text-sm text-muted-foreground">
              Unable to load summary for selected user
            </p>
          )}
          {!isLoadingSummary && selectedUserSummary && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p className="text-foreground">
                  User:{" "}
                  {selectedUserSummary.email || selectedUserSummary.userId}
                </p>
                <p className="text-foreground">
                  Status: {selectedUserSummary.subscriptionStatus || "N/A"}
                </p>
                <p className="text-muted-foreground">
                  Expiry: {formatDate(selectedUserSummary.expiryDate)}
                </p>
                <p className="text-muted-foreground">
                  Type: {selectedUserSummary.subscriptionType || "-"}
                </p>
                <p className="text-muted-foreground">
                  Purchase: {formatDate(selectedUserSummary.purchaseDate)}
                </p>
                <p className="text-muted-foreground">
                  Upcoming:{" "}
                  {selectedUserSummary.upcomingSubscription?.subscriptionType ||
                    "-"}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Manual Subscription Action (Admin only)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <label className="text-xs text-muted-foreground space-y-1">
                    <span>Action</span>
                    <select
                      value={action}
                      onChange={(event) => setAction(event.target.value)}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="extend">extend</option>
                      <option value="activate">activate</option>
                      <option value="deactivate">deactivate</option>
                      <option value="cancel">cancel</option>
                    </select>
                  </label>

                  <label className="text-xs text-muted-foreground space-y-1">
                    <span>Subscription Type</span>
                    <select
                      value={subscriptionType}
                      onChange={(event) =>
                        setSubscriptionType(event.target.value)
                      }
                      className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="basic">basic</option>
                      <option value="premium">premium</option>
                    </select>
                  </label>

                  <label className="text-xs text-muted-foreground space-y-1">
                    <span>Payment Type</span>
                    <select
                      value={paymentType}
                      onChange={(event) => setPaymentType(event.target.value)}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="manual">manual</option>
                      <option value="online">online</option>
                    </select>
                  </label>
                </div>

                <label className="text-xs text-muted-foreground space-y-1 block mb-3">
                  <span>Remark</span>
                  <Input
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    placeholder="Admin remark"
                  />
                </label>

                <Button
                  onClick={handleManualAction}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? "Submitting..." : "Apply Manual Action"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default AdminUsers;
