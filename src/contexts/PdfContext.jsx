import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const PdfContext = createContext(null);

const normalizePdf = (item) => {
  const originalName = item?.originalName || item?.title || "Untitled.pdf";
  const storedName = item?.storedName || item?.fileName || originalName;
  const uploadedAt =
    item?.uploadedAt || item?.createdAt || new Date().toISOString();

  return {
    id: item?.id || item?._id || `pdf-${storedName}`,
    name: item?.title || originalName,
    title: item?.title || originalName,
    description: item?.description || "",
    locked: Boolean(item?.locked),
    originalName,
    fileName: storedName,
    uploadedBy: item?.uploadedBy || item?.uploadedByName || "You",
    uploadedAt: new Date(uploadedAt).toISOString().split("T")[0],
    pageCount: item?.pageCount || 1,
    thumbnailUrl: item?.thumbnailUrl || "",
    size: item?.size,
    mimeType: item?.mimeType,
    path: item?.path,
  };
};

export const PdfProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(false);

  const getPdfFileEndpoint = useCallback((fileName) => {
    if (!fileName) return "";
    return buildApiUrl(
      `/users/admin-pdfs/file/${encodeURIComponent(fileName)}`,
    );
  }, []);

  const refreshPdfs = useCallback(async () => {
    if (!user?.id) {
      setPdfs([]);
      return;
    }

    try {
      setIsLoadingPdfs(true);
      const response = await fetch(buildApiUrl("/users/admin-pdfs"), {
        method: "GET",
        credentials: "include",
        headers: withAuthHeader(accessToken),
      });

      const payload = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load PDFs");
      }

      const files = Array.isArray(payload?.pdfs) ? payload.pdfs : [];
      setPdfs(files.map(normalizePdf));
    } catch {
      setPdfs([]);
    } finally {
      setIsLoadingPdfs(false);
    }
  }, [accessToken, user?.id]);

  useEffect(() => {
    refreshPdfs();
  }, [refreshPdfs]);

  const addPdf = (name, uploadedBy) => {
    if (!name) return;

    const newPdf = normalizePdf({
      _id: `pdf-${Date.now()}`,
      originalName: name,
      storedName: name,
      uploadedBy,
      createdAt: new Date().toISOString(),
      pageCount: 1,
    });

    setPdfs((prev) => [newPdf, ...prev]);
  };

  const removePdf = (id) => {
    setPdfs((prev) => prev.filter((pdf) => pdf.id !== id));
  };

  return (
    <PdfContext.Provider
      value={{
        pdfs,
        addPdf,
        removePdf,
        refreshPdfs,
        getPdfFileEndpoint,
        isLoadingPdfs,
      }}
    >
      {children}
    </PdfContext.Provider>
  );
};

export const usePdfs = () => {
  const context = useContext(PdfContext);
  if (!context) {
    throw new Error("usePdfs must be used within PdfProvider");
  }
  return context;
};
