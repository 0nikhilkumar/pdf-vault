import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground mb-6">
            Your subscription was not activated. Buy the plan to read and upload
            PDFs.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={() => navigate("/subscription/buy")}
              className="h-11 px-6"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="h-11 px-6"
            >
              Back To Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default SubscriptionCancel;
