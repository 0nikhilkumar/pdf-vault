import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useAuth } from "@/contexts/AuthContext";
import { usePdfs } from "@/contexts/PdfContext";
import { Button } from "@/components/ui/button";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PdfViewer = ({ pdf, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [fileLoadError, setFileLoadError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [renderVersion, setRenderVersion] = useState(0);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const { user, accessToken } = useAuth();
  const { getPdfFileEndpoint } = usePdfs();
  const canDownload =
    user?.role === "admin" || user?.subscriptionPlanId === "premium";

  const goToPage = (targetPage) => {
    setCurrentPage(() => {
      const safePage = Math.max(
        1,
        Math.min(Number(targetPage) || 1, totalPages),
      );
      return safePage;
    });
  };

  const visiblePages = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 6, 7];
    }

    if (currentPage >= totalPages - 3) {
      return Array.from({ length: 7 }, (_, index) => totalPages - 6 + index);
    }

    return Array.from({ length: 7 }, (_, index) => currentPage - 3 + index);
  })();

  useEffect(() => {
    let isMounted = true;
    let loadingTask;

    const loadPdf = async () => {
      try {
        setIsLoadingFile(true);
        setFileLoadError("");
        setPdfDocument(null);
        setPdfBlob(null);
        setTotalPages(1);
        setCurrentPage(1);
        setZoomLevel(1);
        setRotation(0);

        const fileIdentifier = pdf?.fileName || pdf?.storedName || pdf?.name;
        const endpointCandidates = [
          {
            url:
              pdf?.fileEndpoint ||
              (fileIdentifier
                ? buildApiUrl(
                    `/landing-page/pdf/${encodeURIComponent(fileIdentifier)}`,
                  )
                : ""),
            requiresAuth: false,
          },
          {
            url: fileIdentifier
              ? buildApiUrl(
                  `/landing-page/pdf/${encodeURIComponent(fileIdentifier)}`,
                )
              : "",
            requiresAuth: false,
          },
          {
            url: getPdfFileEndpoint(fileIdentifier),
            requiresAuth: true,
          },
        ].filter((candidate) => Boolean(candidate.url));

        if (endpointCandidates.length === 0) {
          setFileLoadError("File not found");
          return;
        }

        let resolvedResponse = null;
        let resolvedPayload = null;

        for (const candidate of endpointCandidates) {
          const response = await fetch(candidate.url, {
            method: "GET",
            credentials: candidate.requiresAuth ? "include" : "omit",
            headers: candidate.requiresAuth ? withAuthHeader(accessToken) : {},
          });

          if (response.ok) {
            resolvedResponse = response;
            break;
          }

          resolvedPayload = await parseJsonSafely(response);

          if (!candidate.requiresAuth && response.status === 403) {
            if (!isMounted) return;
            setFileLoadError(
              resolvedPayload?.message || "This PDF is locked for free users",
            );
            return;
          }
        }

        if (!resolvedResponse) {
          if (!isMounted) return;
          setFileLoadError(resolvedPayload?.message || "File not found");
          return;
        }

        const fetchedBlob = await resolvedResponse.blob();
        const fileData = new Uint8Array(await fetchedBlob.arrayBuffer());

        loadingTask = getDocument({ data: fileData });
        const loadedDocument = await loadingTask.promise;

        if (!isMounted) return;

        setPdfBlob(fetchedBlob);
        setPdfDocument(loadedDocument);
        setTotalPages(loadedDocument.numPages || 1);
        setCurrentPage(1);
      } catch {
        if (isMounted) {
          setFileLoadError("Unable to open file");
        }
      } finally {
        if (isMounted) {
          setIsLoadingFile(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [
    accessToken,
    getPdfFileEndpoint,
    pdf?.fileEndpoint,
    pdf?.fileName,
    pdf?.name,
    pdf?.storedName,
  ]);

  useEffect(() => {
    let isMounted = true;
    let renderTask;

    const renderCurrentPage = async () => {
      if (!pdfDocument || !canvasRef.current || currentPage < 1) return;

      try {
        setIsRenderingPage(true);

        const page = await pdfDocument.getPage(currentPage);
        const baseViewport = page.getViewport({ scale: 1, rotation });
        const viewportContainer = viewportRef.current;
        const availableWidth = Math.max(
          (viewportContainer?.clientWidth || window.innerWidth) - 48,
          240,
        );
        const availableHeight = Math.max(
          (viewportContainer?.clientHeight || window.innerHeight) - 48,
          240,
        );

        const fitScale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
        );
        const scale = fitScale * zoomLevel;
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
      } catch {
        if (isMounted) {
          setFileLoadError("Unable to render this page");
        }
      } finally {
        if (isMounted) {
          setIsRenderingPage(false);
        }
      }
    };

    renderCurrentPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [currentPage, pdfDocument, rotation, zoomLevel, renderVersion]);

  useEffect(() => {
    const resizeHandler = () => {
      setRenderVersion((version) => version + 1);
    };

    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  const handleDownload = () => {
    if (!canDownload || !pdfBlob) return;

    const fileUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = fileUrl;
    anchor.download = pdf.name.endsWith(".pdf") ? pdf.name : `${pdf.name}.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(fileUrl), 0);
  };

  const handleZoomIn = () => {
    setZoomLevel((level) => Math.min(level + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((level) => Math.max(level - 0.2, 0.6));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleRotate = () => {
    setRotation((value) => (value + 90) % 360);
  };

  const handlePanStart = (event) => {
    if (zoomLevel <= 1 || !viewportRef.current) return;

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
    setIsDraggingCanvas(true);

    // Attach document-level handlers for smooth dragging
    document.addEventListener("mousemove", handlePanMove);
    document.addEventListener("mouseup", handlePanEnd);
  };

  const handlePanMove = (event) => {
    if (!dragStateRef.current.isDragging || !viewportRef.current) return;

    event.preventDefault();
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    viewportRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX;
    viewportRef.current.scrollTop = dragStateRef.current.scrollTop - deltaY;
  };

  const handlePanEnd = () => {
    if (!dragStateRef.current.isDragging) return;
    dragStateRef.current.isDragging = false;
    setIsDraggingCanvas(false);

    // Remove document-level handlers
    document.removeEventListener("mousemove", handlePanMove);
    document.removeEventListener("mouseup", handlePanEnd);
  };

  useEffect(() => {
    return () => {
      // Cleanup document-level listeners on unmount
      document.removeEventListener("mousemove", handlePanMove);
      document.removeEventListener("mouseup", handlePanEnd);
    };
  }, []);

  useEffect(() => {
    const contextMenuHandler = (event) => event.preventDefault();
    document.addEventListener("contextmenu", contextMenuHandler);
    return () =>
      document.removeEventListener("contextmenu", contextMenuHandler);
  }, []);

  useEffect(() => {
    const keyHandler = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "s" || event.key === "p")
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6 md:py-4 border-b border-border">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <FileText className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
          <h2 className="max-w-[42vw] truncate text-sm font-semibold text-foreground sm:max-w-[48vw] sm:text-base md:max-w-[40vw]">
            {pdf.name}
          </h2>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:gap-3 md:w-auto md:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.6}
              title="Zoom out"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomReset}
              title="Reset zoom"
              className="h-8 min-w-14 px-2 text-xs sm:h-9 sm:min-w-16"
            >
              {Math.round(zoomLevel * 100)}%
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              title="Zoom in"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRotate}
              title="Rotate page"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          {canDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
          <span className="hidden text-sm text-muted-foreground md:inline">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto p-3 sm:p-4 md:p-8">
        <div
          className="no-select w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
          onDragStart={(event) => event.preventDefault()}
        >
          {isLoadingFile ? (
            <div className="px-4 py-6 text-sm text-muted-foreground sm:px-6 sm:py-8">
              Loading PDF...
            </div>
          ) : fileLoadError ? (
            <div className="px-4 py-6 text-sm text-muted-foreground sm:px-6 sm:py-8">
              {fileLoadError}
            </div>
          ) : (
            <div
              ref={viewportRef}
              className="relative no-select min-h-[55vh] overflow-auto bg-muted/30 sm:min-h-[65vh] md:min-h-[75vh]"
            >
              <div className="inline-flex min-w-full min-h-full items-center justify-center p-2 sm:p-3 md:p-4">
                <canvas
                  ref={canvasRef}
                  title={pdf.name}
                  className={`bg-white rounded shadow select-none ${
                    zoomLevel > 1
                      ? isDraggingCanvas
                        ? "cursor-grabbing"
                        : "cursor-grab"
                      : "cursor-default"
                  }`}
                  onMouseDown={handlePanStart}
                />
                {isRenderingPage && (
                  <div className="absolute inset-0 flex items-start justify-center pt-4 text-xs text-muted-foreground sm:pt-6">
                    Rendering page...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border px-2 py-3 sm:gap-3 sm:px-3 sm:py-4">
        <Button
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex max-w-[78vw] gap-1 overflow-x-auto pb-1 sm:max-w-[70vw] md:max-w-none md:overflow-visible md:pb-0">
          {totalPages > 7 && visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => goToPage(1)}
                className="h-8 min-w-8 px-2 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                1
              </button>
              <span className="h-8 w-8 flex items-center justify-center text-muted-foreground text-xs">
                ...
              </span>
            </>
          )}

          {visiblePages.map((page) => (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {page}
            </button>
          ))}

          {totalPages > 7 &&
            visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                <span className="h-8 w-8 flex items-center justify-center text-muted-foreground text-xs">
                  ...
                </span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className="h-8 min-w-8 px-2 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
        </div>
        <Button
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default PdfViewer;
