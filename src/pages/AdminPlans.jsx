import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const initialFormState = {
  planType: "",
  price: "",
  month: "1",
  description: "",
};

const SUBSCRIPTION_PLANS_PATH = "/admin/subscriptions/plans";

const AdminPlans = () => {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [editForm, setEditForm] = useState(initialFormState);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState("");

  const loadPlans = async () => {
    try {
      setIsLoadingPlans(true);

      const response = await fetch(buildApiUrl(SUBSCRIPTION_PLANS_PATH), {
        method: "GET",
        credentials: "include",
        headers: withAuthHeader(accessToken),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load subscription plans",
        );
      }

      setPlans(Array.isArray(payload?.plans) ? payload.plans : []);
    } catch (error) {
      setPlans([]);
      toast({
        title: "Unable to load plans",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [accessToken]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditField = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEditPlan = (plan) => {
    setEditingPlanId(plan?._id || "");
    setEditForm({
      planType: String(plan?.planType || ""),
      price: String(plan?.price ?? ""),
      month: String(plan?.month ?? "1"),
      description: String(plan?.description || ""),
    });
  };

  const cancelEditPlan = () => {
    setEditingPlanId("");
    setEditForm(initialFormState);
  };

  const handleUpdatePlan = async (planId) => {
    const normalizedPlanType = String(editForm.planType || "")
      .trim()
      .toLowerCase();
    if (!normalizedPlanType) {
      toast({
        title: "Plan type required",
        description: "Enter plan type (example: basic or premium)",
        variant: "destructive",
      });
      return;
    }

    const normalizedPrice = Number(editForm.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Price must be greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }

    const normalizedMonth = Number(editForm.month);
    if (
      !Number.isInteger(normalizedMonth) ||
      normalizedMonth < 1 ||
      normalizedMonth > 120
    ) {
      toast({
        title: "Invalid month",
        description: "Month must be an integer between 1 and 120",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingPlan(true);

      const response = await fetch(
        buildApiUrl(`${SUBSCRIPTION_PLANS_PATH}/${encodeURIComponent(planId)}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            ...withAuthHeader(accessToken),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planType: normalizedPlanType,
            price: normalizedPrice,
            month: normalizedMonth,
            description: String(editForm.description || "").trim(),
          }),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update subscription plan",
        );
      }

      toast({
        title: "Plan updated",
        description:
          payload?.message || "Subscription plan updated successfully",
      });

      cancelEditPlan();
      await loadPlans();
    } catch (error) {
      toast({
        title: "Plan update failed",
        description: error.message || "Unable to update subscription plan",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!planId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this subscription plan?",
    );
    if (!confirmDelete) return;

    try {
      setDeletingPlanId(planId);

      const response = await fetch(
        buildApiUrl(`${SUBSCRIPTION_PLANS_PATH}/${encodeURIComponent(planId)}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: withAuthHeader(accessToken),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to delete subscription plan",
        );
      }

      toast({
        title: "Plan deleted",
        description:
          payload?.message || "Subscription plan deleted successfully",
      });

      if (editingPlanId === planId) {
        cancelEditPlan();
      }
      await loadPlans();
    } catch (error) {
      toast({
        title: "Plan delete failed",
        description: error.message || "Unable to delete subscription plan",
        variant: "destructive",
      });
    } finally {
      setDeletingPlanId("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedPlanType = String(form.planType || "")
      .trim()
      .toLowerCase();
    if (!normalizedPlanType) {
      toast({
        title: "Plan type required",
        description: "Enter plan type (example: basic or premium)",
        variant: "destructive",
      });
      return;
    }

    const normalizedPrice = Number(form.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      toast({
        title: "Invalid price",
        description: "Price must be greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }

    const normalizedMonth = Number(form.month);
    if (
      !Number.isInteger(normalizedMonth) ||
      normalizedMonth < 1 ||
      normalizedMonth > 120
    ) {
      toast({
        title: "Invalid month",
        description: "Month must be an integer between 1 and 120",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(buildApiUrl(SUBSCRIPTION_PLANS_PATH), {
        method: "POST",
        credentials: "include",
        headers: {
          ...withAuthHeader(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: normalizedPlanType,
          price: normalizedPrice,
          month: normalizedMonth,
          description: String(form.description || "").trim(),
        }),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to create subscription plan",
        );
      }

      toast({
        title: "Plan created",
        description:
          payload?.message || "Subscription plan created successfully",
      });

      setForm(initialFormState);
      await loadPlans();
    } catch (error) {
      toast({
        title: "Plan creation failed",
        description: error.message || "Unable to create subscription plan",
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
          Subscription Plans
        </h1>
        <p className="text-muted-foreground mt-1">
          Create new subscription plans for users
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Plan Type
              </label>
              <Input
                value={form.planType}
                onChange={(event) =>
                  updateField("planType", event.target.value)
                }
                placeholder="basic / premium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Price
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="e.g. 299"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Month
              </label>
              <Input
                type="number"
                min="1"
                max="120"
                step="1"
                value={form.month}
                onChange={(event) => updateField("month", event.target.value)}
                placeholder="e.g. 1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description / Features
            </label>
            <textarea
              rows={7}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder={
                "Write feature points, one per line\n- Read PDFs\n- Upload own PDFs\n- Download enabled"
              }
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Plan"}
          </Button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">All Plans</h2>
          <span className="text-sm text-muted-foreground">
            {plans.length} total
          </span>
        </div>

        {isLoadingPlans && (
          <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
            Loading plans...
          </div>
        )}

        {!isLoadingPlans && plans.length === 0 && (
          <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
            No plans created yet.
          </div>
        )}

        {!isLoadingPlans && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isEditing = editingPlanId === plan?._id;
              const creatorName = [
                plan?.createdBy?.firstName,
                plan?.createdBy?.lastName,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={plan?._id} className="glass rounded-xl p-5">
                  {isEditing ? (
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          value={editForm.planType}
                          onChange={(event) =>
                            updateEditField("planType", event.target.value)
                          }
                          placeholder="Plan type"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.price}
                          onChange={(event) =>
                            updateEditField("price", event.target.value)
                          }
                          placeholder="Price"
                        />
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          step="1"
                          value={editForm.month}
                          onChange={(event) =>
                            updateEditField("month", event.target.value)
                          }
                          placeholder="Month"
                        />
                      </div>
                      <textarea
                        rows={5}
                        value={editForm.description}
                        onChange={(event) =>
                          updateEditField("description", event.target.value)
                        }
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdatePlan(plan?._id)}
                          disabled={isUpdatingPlan}
                        >
                          {isUpdatingPlan ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditPlan}
                          disabled={isUpdatingPlan}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-base font-semibold text-foreground uppercase">
                          {plan?.planType || "-"}
                        </p>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {plan?.month || 0} month
                          {Number(plan?.month || 0) > 1 ? "s" : ""}
                        </span>
                      </div>

                      <p className="text-lg font-bold text-foreground mb-3">
                        INR {Number(plan?.price || 0)}
                      </p>

                      <p className="text-xs text-muted-foreground mb-2">
                        Features
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-line mb-4">
                        {plan?.description || "No description"}
                      </p>
                    </>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
                    <p>
                      Created by:{" "}
                      {creatorName || plan?.createdBy?.email || "Admin"}
                    </p>
                    <p>Created on: {formatDate(plan?.createdAt)}</p>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditPlan(plan)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePlan(plan?._id)}
                        disabled={deletingPlanId === plan?._id}
                      >
                        {deletingPlanId === plan?._id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default AdminPlans;
