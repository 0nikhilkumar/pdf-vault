import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  const [isUpdatingUserId, setIsUpdatingUserId] = useState("");
  const [isDeletingUserId, setIsDeletingUserId] = useState("");

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

      if (allUsersResponse.ok) {
        setUsers(
          Array.isArray(allUsersPayload?.users) ? allUsersPayload.users : [],
        );
      } else {
        setUsers([]);
      }

      if (subscribedUsersResponse.ok) {
        setSubscribedUsers(
          Array.isArray(subscribedUsersPayload?.subscribedUsers)
            ? subscribedUsersPayload.subscribedUsers
            : [],
        );
      } else {
        setSubscribedUsers([]);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [accessToken]);

  const subscribedIdSet = useMemo(
    () => new Set(subscribedUsers.map((entry) => String(entry?._id))),
    [subscribedUsers],
  );

  const handleSelectUser = async (userId) => {
    if (!userId) return;

    if (expandedUserId === userId) {
      setExpandedUserId("");
      return;
    }

    setExpandedUserId(userId);
  };

  const handleEditUser = async (entry) => {
    const userId = entry?._id;
    if (!userId) return;

    const username = window.prompt("Username", String(entry?.username || ""));
    if (username === null) return;

    const email = window.prompt("Email", String(entry?.email || ""));
    if (email === null) return;

    const firstName = window.prompt(
      "First Name",
      String(entry?.firstName || ""),
    );
    if (firstName === null) return;

    const lastName = window.prompt("Last Name", String(entry?.lastName || ""));
    if (lastName === null) return;

    const password = window.prompt(
      "New Password (optional, leave blank to keep old)",
      "",
    );

    try {
      setIsUpdatingUserId(String(userId));
      const response = await fetch(
        buildApiUrl(`/admin/users/${encodeURIComponent(userId)}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            ...withAuthHeader(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: String(username || "").trim(),
            email: String(email || "")
              .trim()
              .toLowerCase(),
            firstName: String(firstName || "").trim(),
            lastName: String(lastName || "").trim(),
            ...(String(password || "").trim()
              ? { password: String(password).trim() }
              : {}),
          }),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update user");
      }

      toast({ title: payload?.message || "User updated successfully" });
      await loadUsers();
    } catch (error) {
      toast({
        title: "Update user failed",
        description: error?.message || "Unable to update user",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingUserId("");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!userId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?",
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingUserId(String(userId));
      const response = await fetch(
        buildApiUrl(`/admin/users/${encodeURIComponent(userId)}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: withAuthHeader(accessToken),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete user");
      }

      toast({ title: payload?.message || "User deleted successfully" });

      if (String(userId) === String(expandedUserId)) {
        setExpandedUserId("");
      }

      await loadUsers();
    } catch (error) {
      toast({
        title: "Delete user failed",
        description: error?.message || "Unable to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUserId("");
    }
  };

  const visibleUsers = useMemo(() => {
    const nonAdminUsers = users.filter(
      (entry) => String(entry?.role || "user").toLowerCase() !== "admin",
    );

    if (!isSubscribedPage) return nonAdminUsers;

    const subscribedIdSet = new Set(
      subscribedUsers.map((entry) => String(entry?._id)),
    );
    return nonAdminUsers.filter((entry) =>
      subscribedIdSet.has(String(entry?._id)),
    );
  }, [isSubscribedPage, subscribedUsers, users]);

  const expandedUser = useMemo(
    () =>
      visibleUsers.find(
        (entry) => String(entry?._id) === String(expandedUserId),
      ) || null,
    [expandedUserId, visibleUsers],
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {isSubscribedPage ? "Subscribed Users" : "Registered Users"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSubscribedPage
            ? "Subscribed users list"
            : "Only registered users with edit and delete actions"}
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
        <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>User</span>
          <span>Email</span>
          <span>Joined</span>
          <span>{isSubscribedPage ? "Status" : "Role"}</span>
          <span>Actions</span>
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
          {visibleUsers.map((entry, index) => {
            const isExpanded = String(expandedUserId) === String(entry._id);
            const displayName =
              entry.name ||
              [entry.firstName, entry.lastName].filter(Boolean).join(" ") ||
              entry.username ||
              "User";

            return (
              <div key={entry._id} className="divide-y divide-border/50">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer ${
                    isExpanded ? "bg-muted/40" : ""
                  }`}
                  onClick={() => handleSelectUser(entry._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground truncate">
                    {entry.email}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(entry.createdAt || Date.now())}
                  </span>
                  <div>
                    {isSubscribedPage ? (
                      subscribedIdSet.has(String(entry._id)) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                          <Crown className="h-3 w-3" /> Pro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          <User className="h-3 w-3" /> Free
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {String(entry?.role || "user")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdatingUserId === String(entry._id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditUser(entry);
                      }}
                    >
                      {isUpdatingUserId === String(entry._id)
                        ? "Saving..."
                        : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDeletingUserId === String(entry._id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteUser(entry._id);
                      }}
                    >
                      {isDeletingUserId === String(entry._id)
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                </motion.div>

                {isExpanded && (
                  <div className="px-6 py-4 bg-background/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p className="text-foreground">
                        <span className="text-muted-foreground">Name: </span>
                        {displayName}
                      </p>
                      <p className="text-foreground">
                        <span className="text-muted-foreground">
                          Username:{" "}
                        </span>
                        {entry.username || "-"}
                      </p>
                      <p className="text-foreground">
                        <span className="text-muted-foreground">Email: </span>
                        {entry.email || "-"}
                      </p>
                      <p className="text-foreground">
                        <span className="text-muted-foreground">Role: </span>
                        {entry.role || "user"}
                      </p>
                      <p className="text-foreground md:col-span-2">
                        <span className="text-muted-foreground">Joined: </span>
                        {formatDate(entry.createdAt || Date.now())}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {expandedUser && (
        <div className="glass rounded-xl mt-6 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Profile Dropdown
          </h2>
          <p className="text-xs text-muted-foreground">
            Click the selected row again to close.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default AdminUsers;
