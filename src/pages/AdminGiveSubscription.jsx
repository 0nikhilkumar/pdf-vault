import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const AdminGiveSubscription = () => {
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState("basic");
  const [paymentType, setPaymentType] = useState("cash");
  const [durationMonths, setDurationMonths] = useState("1");
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserSummary, setSelectedUserSummary] = useState(null);
  const [isLoadingUserSummary, setIsLoadingUserSummary] = useState(false);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);

      const response = await fetch(buildApiUrl("/admin/all-users"), {
        method: "GET",
        credentials: "include",
        headers: withAuthHeader(accessToken),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load users");
      }

      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (error) {
      setUsers([]);
      toast({
        title: "Unable to load users",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [accessToken]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = String(searchTerm || "")
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    const matchedUsers = users.filter((entry) => {
      const email = String(entry?.email || "").trim();
      const username = String(entry?.username || "").trim();
      const fullName = [entry?.firstName, entry?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!normalizedSearch) return true;

      const haystack = [email, username, fullName, String(entry?._id || "")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    return matchedUsers;
  }, [searchTerm, users]);

  const selectedUser = useMemo(
    () =>
      users.find((entry) => String(entry?._id) === String(selectedUserId)) ||
      null,
    [selectedUserId, users],
  );

  const selectedUserName = useMemo(() => {
    if (!selectedUser) return "-";
    const fullName = [selectedUser?.firstName, selectedUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || selectedUser?.username || selectedUser?.email || "-";
  }, [selectedUser]);

  useEffect(() => {
    let isMounted = true;

    const loadSelectedUserSummary = async () => {
      if (!selectedUserId) {
        setSelectedUserSummary(null);
        setIsLoadingUserSummary(false);
        return;
      }

      try {
        setIsLoadingUserSummary(true);
        const response = await fetch(
          buildApiUrl(
            `/admin/${encodeURIComponent(selectedUserId)}/with-subscriptions`,
          ),
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

        if (isMounted) {
          setSelectedUserSummary(payload?.users || null);
        }
      } catch {
        if (isMounted) {
          setSelectedUserSummary(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUserSummary(false);
        }
      }
    };

    loadSelectedUserSummary();

    return () => {
      isMounted = false;
    };
  }, [accessToken, selectedUserId]);

  const hasSubscriptionInfo = useMemo(() => {
    if (!selectedUserSummary) return false;

    return Boolean(
      selectedUserSummary?.subscriptionId ||
      selectedUserSummary?.subscriptionStatus ||
      selectedUserSummary?.subscriptionType ||
      selectedUserSummary?.expiryDate ||
      selectedUserSummary?.purchaseDate ||
      selectedUserSummary?.activeSubscription,
    );
  }, [selectedUserSummary]);

  const handleAssignSubscription = async (event) => {
    event.preventDefault();

    if (!selectedUserId) {
      toast({
        title: "User required",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    const parsedDurationMonths = Number(durationMonths);
    if (!Number.isInteger(parsedDurationMonths) || parsedDurationMonths < 1) {
      toast({
        title: "Invalid duration",
        description: "Duration months must be a positive integer",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(buildApiUrl("/admin/subscriptions/manual"), {
        method: "POST",
        credentials: "include",
        headers: {
          ...withAuthHeader(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          subscriptionType,
          paymentType,
          durationMonths: parsedDurationMonths,
          remark: String(remark || "").trim(),
        }),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to assign subscription");
      }

      toast({
        title: payload?.message || "Subscription assigned successfully",
      });

      setDurationMonths("1");
      setRemark("");
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error?.message || "Unable to assign subscription",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Give Subscription
        </h1>
        <p className="text-muted-foreground mt-1">
          Assign manual subscription to any registered user
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-5">
            Give Subscription
          </h2>

          <form onSubmit={handleAssignSubscription} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Search User
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onFocus={() => {
                    if (searchTerm.trim()) {
                      setIsSearchDropdownOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchTerm(nextValue);
                    setIsSearchDropdownOpen(Boolean(nextValue.trim()));
                  }}
                  placeholder="Search by email, username, name or id"
                  disabled={isLoadingUsers}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setIsSearchDropdownOpen(false);
                  }}
                  disabled={isLoadingUsers}
                >
                  Clear
                </Button>
              </div>
              {isSearchDropdownOpen && (
                <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
                  {isLoadingUsers && (
                    <p className="text-xs text-muted-foreground px-2 py-1">
                      Loading users...
                    </p>
                  )}
                  {!isLoadingUsers &&
                    searchTerm.trim() &&
                    filteredUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        Not found
                      </p>
                    )}
                  {!isLoadingUsers &&
                    filteredUsers.map((entry) => {
                      const label =
                        entry?.email ||
                        entry?.username ||
                        [entry?.firstName, entry?.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        entry?._id;
                      const isSelected =
                        String(selectedUserId) === String(entry?._id);

                      return (
                        <button
                          key={entry?._id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(entry?._id || "");
                            setSearchTerm(String(entry?.email || label));
                            setIsSearchDropdownOpen(false);
                          }}
                          className={`w-full text-left rounded-md px-2 py-2 text-sm transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                </div>
              )}
              {!isLoadingUsers && isSearchDropdownOpen && searchTerm.trim() && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-muted-foreground space-y-2">
                <span className="font-medium text-foreground">
                  Subscription Type
                </span>
                <select
                  value={subscriptionType}
                  onChange={(event) => setSubscriptionType(event.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="basic">basic</option>
                  <option value="premium">premium</option>
                </select>
              </label>

              <label className="text-sm text-muted-foreground space-y-2">
                <span className="font-medium text-foreground">
                  Payment Type
                </span>
                <select
                  value={paymentType}
                  onChange={(event) => setPaymentType(event.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="cash">cash</option>
                  <option value="online">online</option>
                  <option value="upi">upi</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-muted-foreground space-y-2">
                <span className="font-medium text-foreground">
                  Duration (months)
                </span>
                <Input
                  type="number"
                  min="1"
                  value={durationMonths}
                  onChange={(event) => setDurationMonths(event.target.value)}
                  placeholder="1"
                />
              </label>

              <label className="text-sm text-muted-foreground space-y-2">
                <span className="font-medium text-foreground">Remark</span>
                <Input
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Admin remark"
                />
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting || isLoadingUsers}>
              {isSubmitting ? "Assigning..." : "Assign Subscription"}
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            User Profile
          </h2>

          {!selectedUser && (
            <p className="text-sm text-muted-foreground">
              Search and select a user to view profile details.
            </p>
          )}

          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">
                  {selectedUserName}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">
                  {selectedUser?.email || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-medium text-foreground">
                  {selectedUser?.username || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium text-foreground">
                  {selectedUser?.role || "user"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium text-foreground">
                  {selectedUser?.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 md:col-span-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Subscription Info
                </p>

                {isLoadingUserSummary && (
                  <p className="text-sm text-muted-foreground">
                    Loading subscription...
                  </p>
                )}

                {!isLoadingUserSummary && !hasSubscriptionInfo && (
                  <p className="font-medium text-foreground">Not found</p>
                )}

                {!isLoadingUserSummary && hasSubscriptionInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <p className="text-foreground">
                      Status: {selectedUserSummary?.subscriptionStatus || "-"}
                    </p>
                    <p className="text-foreground">
                      Type: {selectedUserSummary?.subscriptionType || "-"}
                    </p>
                    <p className="text-foreground">
                      Purchase:{" "}
                      {selectedUserSummary?.purchaseDate
                        ? new Date(
                            selectedUserSummary.purchaseDate,
                          ).toLocaleDateString()
                        : "-"}
                    </p>
                    <p className="text-foreground">
                      Expiry:{" "}
                      {selectedUserSummary?.expiryDate
                        ? new Date(
                            selectedUserSummary.expiryDate,
                          ).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default AdminGiveSubscription;
