import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const API_BASE_URL = "http://localhost:3000/api";
const RAZORPAY_BASIC_PLAN_ID =
  import.meta.env.VITE_RAZORPAY_BASIC_PLAN_ID || "plan_Sgt0wTPzSnBF7S";
const RAZORPAY_PREMIUM_PLAN_ID =
  import.meta.env.VITE_RAZORPAY_PREMIUM_PLAN_ID || "plan_Sgt0cmJPpcRc2t";

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    priceInr: 199,
    priceLabel: "Rs 199/month",
    priceId: RAZORPAY_BASIC_PLAN_ID,
    features: [
      "Read PDFs inside secure viewer",
      "Upload your own PDFs",
      "Download option remains disabled",
      "No access without active subscription",
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    priceInr: 299,
    priceLabel: "Rs 299/month",
    priceId: RAZORPAY_PREMIUM_PLAN_ID,
    features: [
      "Read PDFs inside secure viewer",
      "Upload your own PDFs",
      "Download option enabled",
      "No access without active subscription",
    ],
  },
];

const STORAGE_KEYS = {
  user: "docvault.auth.user",
  users: "docvault.auth.users",
  accessToken: "docvault.auth.accessToken",
  refreshToken: "docvault.auth.refreshToken",
};

const normalizePlanId = (planValue, fallback = "basic") => {
  if (!planValue) return fallback;

  const normalized = String(planValue).trim().toLowerCase();

  if (normalized === "basic" || normalized.includes("basic")) {
    return "basic";
  }

  if (
    normalized === "premium" ||
    normalized === "pro" ||
    normalized.includes("premium") ||
    normalized.includes("pro")
  ) {
    return "premium";
  }

  const planById = SUBSCRIPTION_PLANS.find((plan) => plan.id === normalized);
  if (planById) return planById.id;

  const planByPriceId = SUBSCRIPTION_PLANS.find(
    (plan) => plan.priceId.toLowerCase() === normalized,
  );
  if (planByPriceId) return planByPriceId.id;

  return fallback;
};

const readStorage = (key, fallbackValue = null) => {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return fallbackValue;
    if (typeof fallbackValue === "string") return value;
    return JSON.parse(value);
  } catch {
    return fallbackValue;
  }
};

const formatDate = (value) => {
  try {
    const date = new Date(value || new Date());
    return date.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;

  const hasSubscription = Boolean(
    rawUser.hasSubscription ??
    rawUser.isPremium ??
    rawUser.subscription?.active ??
    rawUser.membership === "premium",
  );

  const subscriptionExpiryDate =
    rawUser.subscriptionExpiryDate ||
    rawUser.subscription?.expiryDate ||
    rawUser.subscription?.expiresAt ||
    rawUser.subscription?.endsAt ||
    null;

  const fullName = [rawUser.firstName, rawUser.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    ...rawUser,
    id: rawUser.id || rawUser._id,
    name:
      rawUser.name || fullName || rawUser.username || rawUser.email || "User",
    role: rawUser.role || "user",
    hasSubscription,
    subscriptionExpiryDate: hasSubscription ? subscriptionExpiryDate : null,
    subscriptionPlanId: hasSubscription
      ? normalizePlanId(
          rawUser.subscriptionPlanId ||
            rawUser.subscription?.planId ||
            rawUser.subscriptionType ||
            rawUser.membershipPlan ||
            rawUser.priceId,
          "basic",
        )
      : null,
    joinedAt: formatDate(rawUser.joinedAt || rawUser.createdAt),
  };
};

const parseApiResponse = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Detect page refresh to only run subscription check on reload
  const isRefreshLoad = (() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    return (
      navigationEntry?.type === "reload" || performance.navigation?.type === 1
    );
  })();

  // State initialization from sessionStorage
  const [users, setUsers] = useState(() => readStorage(STORAGE_KEYS.users, []));
  const [user, setUser] = useState(() => readStorage(STORAGE_KEYS.user, null));
  const [accessToken, setAccessToken] = useState(() =>
    readStorage(STORAGE_KEYS.accessToken, ""),
  );
  const [refreshToken, setRefreshToken] = useState(() =>
    readStorage(STORAGE_KEYS.refreshToken, ""),
  );

  // Sync state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [user]);

  useEffect(() => {
    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      sessionStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    }
  }, [refreshToken]);

  const authHeaders = (headers = {}) => {
    if (!accessToken) return headers;
    return { ...headers, Authorization: `Bearer ${accessToken}` };
  };

  const upsertUser = (nextUser) => {
    setUsers((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === nextUser.id);
      if (existingIndex === -1) return [nextUser, ...prev];

      const updated = [...prev];
      updated[existingIndex] = { ...updated[existingIndex], ...nextUser };
      return updated;
    });
  };

  const fetchUserById = async (userId) => {
    if (!userId) return null;

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      credentials: "include",
      headers: authHeaders(),
    });
    const payload = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(payload?.message || "Unable to fetch user profile");
    }

    const userPayload = payload?.user || payload;
    return normalizeUser(userPayload);
  };

  const login = async (identifier, password) => {
    try {
      const trimmedIdentifier = (identifier || "").trim();
      if (!trimmedIdentifier || !password) {
        return {
          success: false,
          message: "Email/username and password are required",
        };
      }

      const requestBody = { password };
      if (trimmedIdentifier.includes("@")) {
        requestBody.email = trimmedIdentifier;
      } else {
        requestBody.username = trimmedIdentifier;
      }

      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await parseApiResponse(response);
      if (!response.ok) {
        return {
          success: false,
          message: payload?.message || "Login failed",
        };
      }

      const normalized = normalizeUser(payload?.user);
      const profile = await fetchUserById(normalized?.id).catch(
        () => normalized,
      );
      const finalUser = profile || normalized;

      setUser(finalUser);
      upsertUser(finalUser);
      setAccessToken(payload?.accessToken || null);
      setRefreshToken(payload?.refreshToken || null);

      return {
        success: true,
        user: finalUser,
        message: payload?.message || "Login successful",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  };

  const signup = async (inputOrName, emailArg, passwordArg) => {
    try {
      const signupData =
        typeof inputOrName === "object"
          ? inputOrName
          : {
              username: emailArg ? emailArg.split("@")[0] : "",
              email: emailArg,
              firstName: inputOrName || "",
              lastName: "",
              password: passwordArg,
            };

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });

      const payload = await parseApiResponse(response);
      if (!response.ok) {
        return {
          success: false,
          message: payload?.message || "Signup failed",
        };
      }

      const normalized = normalizeUser(payload?.user);
      if (normalized) {
        upsertUser(normalized);
      }

      return {
        success: true,
        user: normalized,
        message: payload?.message || "User created successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Signup failed",
      };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/users/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    }
  };

  const updateSubscriptionDetails = (userId, subscriptionDetails = {}) => {
    const nextHasSubscription = Boolean(
      subscriptionDetails.hasSubscription ?? false,
    );
    const nextExpiryDate =
      subscriptionDetails.subscriptionExpiryDate ||
      subscriptionDetails.expiryDate ||
      subscriptionDetails.expiresAt ||
      subscriptionDetails.endsAt ||
      null;
    const nextPlanId = normalizePlanId(
      subscriptionDetails.planId ||
        subscriptionDetails.subscriptionPlanId ||
        subscriptionDetails.subscriptionType ||
        subscriptionDetails.priceId,
      null,
    );
    const nextScheduledPlans = Array.isArray(subscriptionDetails.scheduledPlans)
      ? subscriptionDetails.scheduledPlans
      : [];
    const nextSubscriptionSnapshot = {
      ...subscriptionDetails,
      planId:
        nextPlanId ||
        subscriptionDetails.planId ||
        subscriptionDetails.subscriptionPlanId,
      scheduledPlans: nextScheduledPlans,
    };

    setUsers((prev) =>
      prev.map((entry) =>
        entry.id === userId
          ? {
              ...entry,
              hasSubscription: nextHasSubscription,
              subscriptionPlanId: nextHasSubscription
                ? nextPlanId || entry.subscriptionPlanId || "basic"
                : null,
              subscriptionExpiryDate: nextHasSubscription
                ? nextExpiryDate || entry.subscriptionExpiryDate || null
                : null,
              scheduledPlans: nextHasSubscription ? nextScheduledPlans : [],
              subscription: nextHasSubscription
                ? {
                    ...(entry.subscription || {}),
                    ...nextSubscriptionSnapshot,
                  }
                : null,
            }
          : entry,
      ),
    );

    setUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      return {
        ...prev,
        hasSubscription: nextHasSubscription,
        subscriptionPlanId: nextHasSubscription
          ? nextPlanId || prev.subscriptionPlanId || "basic"
          : null,
        subscriptionExpiryDate: nextHasSubscription
          ? nextExpiryDate || prev.subscriptionExpiryDate || null
          : null,
        scheduledPlans: nextHasSubscription ? nextScheduledPlans : [],
        subscription: nextHasSubscription
          ? {
              ...(prev.subscription || {}),
              ...nextSubscriptionSnapshot,
            }
          : null,
      };
    });
  };

  useEffect(() => {
    const runRefreshSubscriptionCheck = async () => {
      if (!isRefreshLoad || !user?.id) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/users/subscription/check`,
          {
            method: "GET",
            credentials: "include",
            headers: authHeaders(),
          },
        );

        const payload = await parseApiResponse(response);
        if (!response.ok || !payload) return;

        const subscription = payload.subscription || {};
        updateSubscriptionDetails(user.id, {
          hasSubscription: Boolean(
            payload.hasSubscription ?? payload.isPremium ?? false,
          ),
          ...subscription,
          planId:
            subscription.subscriptionType ||
            subscription.planId ||
            user.subscriptionPlanId,
          expiryDate: subscription.expiryDate,
          expiresAt: subscription.expiresAt,
          subscriptionExpiryDate: subscription.expiryDate,
        });
      } catch {
        return;
      }
    };

    runRefreshSubscriptionCheck();
  }, [isRefreshLoad, user?.id]);

  const extendCurrentSubscription = async () => {
    if (!user?.id || !accessToken) {
      return {
        success: false,
        message: "Please log in again to extend your subscription",
      };
    }

    // Get the current plan to send the priceId
    const currentPlan = SUBSCRIPTION_PLANS.find(
      (plan) => plan.id === user?.subscriptionPlanId,
    );

    if (!currentPlan) {
      return {
        success: false,
        message: "Unable to determine current subscription plan",
      };
    }

    const gatewayPlanId = String(currentPlan.priceId || "").trim();
    if (!gatewayPlanId.startsWith("plan_")) {
      return {
        success: false,
        message: "Invalid Razorpay plan ID configured",
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/users/razorpay/subscription/extend`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-user-id": user.id,
          "x-user-email": user.email || "",
        },
        body: JSON.stringify({
          priceId: gatewayPlanId,
          planId: gatewayPlanId,
          subscriptionPlanId: currentPlan.id,
        }),
      },
    );

    const payload = await parseApiResponse(response);
    if (!response.ok) {
      // Some backends do not implement a direct extend endpoint and only support checkout sessions.
      if (response.status === 404 || response.status === 405) {
        const checkoutResponse = await fetch(
          `${API_BASE_URL}/users/razorpay/create-checkout-session`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "x-user-id": user.id,
              "x-user-email": user.email || "",
            },
            body: JSON.stringify({
              priceId: gatewayPlanId,
              planId: gatewayPlanId,
              subscriptionPlanId: currentPlan.id,
            }),
          },
        );

        const checkoutPayload = await parseApiResponse(checkoutResponse);
        if (checkoutResponse.ok && checkoutPayload?.url) {
          return {
            success: true,
            checkoutUrl: checkoutPayload.url,
            message:
              checkoutPayload?.message ||
              "Redirecting to checkout to extend your subscription",
          };
        }
      }

      return {
        success: false,
        message:
          payload?.message ||
          `Unable to extend subscription (HTTP ${response.status})`,
      };
    }

    const subscriptionDetails = payload?.subscription || payload;
    if (subscriptionDetails) {
      updateSubscriptionDetails(user.id, subscriptionDetails);
    }

    // Refresh page after successful extension to load updated subscription data
    setTimeout(() => {
      window.location.reload();
    }, 1500);

    return {
      success: true,
      message: payload?.message || "Subscription extended successfully",
      subscription: subscriptionDetails,
    };
  };

  const selectedSubscriptionPlan = SUBSCRIPTION_PLANS.find(
    (plan) => plan.id === normalizePlanId(user?.subscriptionPlanId, "basic"),
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        login,
        signup,
        logout,
        allUsers: users,
        updateSubscriptionDetails,
        extendCurrentSubscription,
        subscriptionPlans: SUBSCRIPTION_PLANS,
        selectedSubscriptionPlan:
          selectedSubscriptionPlan || SUBSCRIPTION_PLANS[0],
        subscriptionPlan: selectedSubscriptionPlan || SUBSCRIPTION_PLANS[0],
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
