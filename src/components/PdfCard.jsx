import { motion } from "framer-motion";
import { Calendar, Eye, FileText, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const PdfCard = ({ pdf, onView, index }) => {
  const { user } = useAuth();
  const isPremiumUser =
    user?.role === "admin" ||
    user?.subscriptionPlanId === "premium" ||
    (user?.hasSubscription && !user?.subscriptionPlanId);
  const canView = !pdf.locked || isPremiumUser;
  const canDownload =
    user?.role === "admin" || user?.subscriptionPlanId === "premium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group glass rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300"
    >
      <div className="h-32 md:h-40 bg-muted/50 flex items-center justify-center relative">
        <FileText className="h-8 md:h-12 w-8 md:w-12 text-muted-foreground/40" />
        {!canView && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-5 md:h-6 w-5 md:w-6 text-muted-foreground mx-auto mb-1" />
              <span className="text-xs text-muted-foreground">
                Locked for free users
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 md:p-4 space-y-2 md:space-y-3">
        <h3 className="font-semibold text-xs md:text-sm text-foreground truncate">
          {pdf.name}
        </h3>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{pdf.uploadedBy}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            {pdf.uploadedAt}
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {pdf.locked ? "Locked" : "Open"}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground hidden md:inline">
            {canDownload
              ? "Download enabled"
              : canView
                ? "View only"
                : "Locked"}
          </span>
          <Button
            size="sm"
            variant={canView ? "default" : "secondary"}
            disabled={!canView}
            onClick={() => onView(pdf)}
            className="h-8 text-xs w-full md:w-auto"
          >
            <Eye className="h-3 w-3 mr-1" />
            {canView ? "View" : "Locked"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PdfCard;
