import { useState } from "react";
import { motion } from "framer-motion";
import { Check, FileText, Lock, Upload } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { usePdfs } from "@/contexts/PdfContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const UserUpload = () => {
  const { user, accessToken } = useAuth();
  const { addPdf, refreshPdfs } = usePdfs();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpload = user?.hasSubscription;

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Validation error",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      toast({
        title: "Validation error",
        description: "Only PDF files are allowed.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const response = await fetch("http://localhost:3000/api/users/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "x-user-id": user?.id || "",
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Upload failed");
      }

      const uploadedName = data?.file?.originalName || selectedFile.name;
      addPdf(uploadedName, user?.name || "Unknown");
      await refreshPdfs();
      setUploaded(true);
      setSelectedFile(null);
      toast({
        title: "PDF uploaded successfully!",
        description: data?.message || "Upload complete.",
      });
      setTimeout(() => setUploaded(false), 2000);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canUpload) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Subscription Required
          </h2>
          <p className="text-muted-foreground max-w-sm">
            You need an active subscription to upload PDFs. Contact an admin to
            activate yours.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Upload PDF
        </h1>
        <p className="text-muted-foreground mt-1">
          Add new documents to the library
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg"
      >
        <div className="glass rounded-xl p-8">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6 hover:border-primary/50 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag & drop your PDF here
            </p>
            <p className="text-xs text-muted-foreground/60">
              or enter the name below
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
                className="h-11"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isSubmitting}
                className="h-11 px-6"
              >
                {isSubmitting ? (
                  "..."
                ) : uploaded ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              PDF files only • Files are uploaded to backend storage
            </p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default UserUpload;
