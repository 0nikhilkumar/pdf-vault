import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  FileText,
  Lock,
  Pencil,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const parseLockedFlag = (value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return Boolean(value);
};

const AdminUpload = () => {
  const { accessToken } = useAuth();
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locked, setLocked] = useState(true);
  const [pdfs, setPdfs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploaded, setUploaded] = useState(false);
  const [editingPdfId, setEditingPdfId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocked, setEditLocked] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingPdfId, setIsDeletingPdfId] = useState("");

  const loadPdfs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(buildApiUrl("/admin/pdfs"), {
        method: "GET",
        credentials: "include",
        headers: withAuthHeader(accessToken),
      });
      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load PDFs");
      }

      const files = Array.isArray(payload?.pdfs) ? payload.pdfs : [];
      setPdfs(
        files.map((pdf) => ({
          ...pdf,
          locked: parseLockedFlag(pdf?.locked ?? pdf?.isLocked),
        })),
      );
    } catch {
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, [accessToken]);

  const handleUpload = async () => {
    if (!pdfFile) {
      toast({ title: "PDF file is required" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Title is required" });
      return;
    }

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("title", title.trim());
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    const lockedValue = locked ? "true" : "false";
    formData.append("locked", lockedValue);
    formData.append("isLocked", lockedValue);

    const response = await fetch(buildApiUrl("/admin/pdfs/upload"), {
      method: "POST",
      credentials: "include",
      headers: withAuthHeader(accessToken),
      body: formData,
    });

    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      toast({ title: payload?.message || "Upload failed" });
      return;
    }

    setUploaded(true);
    setPdfFile(null);
    setTitle("");
    setDescription("");
    setLocked(true);
    toast({ title: payload?.message || "Admin PDF uploaded successfully" });
    await loadPdfs();
    setTimeout(() => setUploaded(false), 2000);
  };

  const startEdit = (pdf) => {
    setEditingPdfId(pdf?._id || "");
    setEditTitle(pdf?.title || pdf?.originalName || "");
    setEditDescription(pdf?.description || "");
    setEditLocked(parseLockedFlag(pdf?.locked ?? pdf?.isLocked));
  };

  const cancelEdit = () => {
    setEditingPdfId("");
    setEditTitle("");
    setEditDescription("");
    setEditLocked(false);
  };

  const saveEdit = async (pdfId) => {
    if (!pdfId) return;
    if (!editTitle.trim()) {
      toast({ title: "Title is required" });
      return;
    }

    try {
      setIsSavingEdit(true);
      const response = await fetch(buildApiUrl(`/admin/pdfs/${pdfId}`), {
        method: "PATCH",
        credentials: "include",
        headers: {
          ...withAuthHeader(accessToken),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          locked: editLocked,
          isLocked: editLocked,
        }),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        toast({ title: payload?.message || "Update failed" });
        return;
      }

      toast({ title: payload?.message || "PDF metadata updated" });
      cancelEdit();
      await loadPdfs();
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePdf = async (pdfId) => {
    if (!pdfId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PDF?",
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingPdfId(String(pdfId));
      const response = await fetch(
        buildApiUrl(`/admin/pdfs/${encodeURIComponent(pdfId)}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: withAuthHeader(accessToken),
        },
      );

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete PDF");
      }

      toast({ title: payload?.message || "PDF deleted successfully" });

      if (String(editingPdfId) === String(pdfId)) {
        cancelEdit();
      }

      await loadPdfs();
    } catch (error) {
      toast({
        title: "Delete PDF failed",
        description: error?.message || "Unable to delete PDF",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPdfId("");
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Upload & Manage PDFs
        </h1>
        <p className="text-muted-foreground mt-1">
          Add or remove documents from the platform
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 mb-8 max-w-lg"
      >
        <label
          htmlFor="admin-pdf-upload"
          className="block border-2 border-dashed border-border rounded-lg p-6 text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer"
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Upload a new PDF</p>
          {pdfFile && (
            <p className="text-xs text-foreground mt-2 truncate">
              {pdfFile.name}
            </p>
          )}
        </label>
        <div className="space-y-3">
          <Input
            id="admin-pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
            className="hidden"
          />
          <Input
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-11"
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={locked}
              onChange={(event) => setLocked(event.target.checked)}
            />
            Mark as locked (free users won't see this document)
          </label>
          <Button
            onClick={handleUpload}
            disabled={!pdfFile || !title.trim()}
            className="h-11 px-6 w-full"
          >
            {uploaded ? (
              <Check className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            All Documents ({pdfs.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {isLoading && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              Loading PDFs...
            </div>
          )}
          {!isLoading && pdfs.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No uploaded documents
            </div>
          )}
          {pdfs.map((pdf) => (
            <div
              key={pdf._id}
              className="px-6 py-3 hover:bg-muted/30 transition-colors"
            >
              {editingPdfId === pdf._id ? (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <div className="space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      placeholder="Title"
                    />
                    <Input
                      value={editDescription}
                      onChange={(event) =>
                        setEditDescription(event.target.value)
                      }
                      placeholder="Description"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editLocked}
                      onChange={(event) => setEditLocked(event.target.checked)}
                    />
                    Locked
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(pdf._id)}
                      disabled={isSavingEdit}
                    >
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {pdf.title || pdf.originalName}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {pdf.description || "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pdf.originalName} • {pdf.mimeType} • {pdf.size} bytes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {pdf.locked ? (
                        <>
                          <Lock className="h-3 w-3" /> Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3" /> Open
                        </>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(pdf)}
                      disabled={isDeletingPdfId === String(pdf._id)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePdf(pdf._id)}
                      disabled={isDeletingPdfId === String(pdf._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {isDeletingPdfId === String(pdf._id)
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminUpload;
