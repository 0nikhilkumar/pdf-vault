import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  FileText,
  Lock,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PdfViewer from "@/components/PdfViewer";
import { buildApiUrl, parseJsonSafely } from "@/lib/api";

const features = [
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description: "Separate user/admin experiences with protected routing.",
  },
  {
    icon: LockKeyhole,
    title: "Protected Reading",
    description:
      "Preview is blurred and content unlocks only after secure login.",
  },
  {
    icon: FileText,
    title: "Organized Dashboard",
    description: "Browse your PDFs in a clean, focused document library.",
  },
];

const parseLockedFlag = (value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return Boolean(value);
};

const normalizeLandingPdf = (item, index) => {
  const fallbackName = `Document ${index + 1}.pdf`;
  const title = item?.title || item?.originalName || item?.name || fallbackName;
  const uploadedAt = item?.uploadedAt || item?.createdAt || null;
  const fileName =
    item?.storedName ||
    item?.fileName ||
    item?.name ||
    item?.originalName ||
    "";
  const publicFileUrl =
    item?.fileUrl || item?.url || item?.path || item?.downloadUrl || "";
  const fallbackPublicEndpoint = fileName
    ? buildApiUrl(`/landing-page/pdf/file/${encodeURIComponent(fileName)}`)
    : "";

  return {
    id: item?.id || item?._id || `landing-pdf-${index}`,
    name: title,
    title,
    description: item?.description || "",
    locked: parseLockedFlag(item?.locked ?? item?.isLocked),
    uploadedBy: item?.uploadedBy || item?.uploadedByName || "Admin",
    uploadedAt: uploadedAt
      ? new Date(uploadedAt).toISOString().split("T")[0]
      : "Recently added",
    fileName,
    storedName: fileName,
    fileEndpoint: publicFileUrl || fallbackPublicEndpoint,
  };
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [landingPdfs, setLandingPdfs] = useState([]);
  const [isLoadingLandingPdfs, setIsLoadingLandingPdfs] = useState(true);
  const [viewingPdf, setViewingPdf] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadLandingPdfs = async () => {
      try {
        setIsLoadingLandingPdfs(true);
        const response = await fetch(buildApiUrl("/landing-page/pdf"), {
          method: "GET",
          credentials: "omit",
        });
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load PDFs");
        }

        const files = Array.isArray(payload?.pdfs)
          ? payload.pdfs
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        if (!ignore) {
          setLandingPdfs(
            files.map((item, index) => normalizeLandingPdf(item, index)),
          );
        }
      } catch {
        if (!ignore) {
          setLandingPdfs([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingLandingPdfs(false);
        }
      }
    };

    loadLandingPdfs();

    return () => {
      ignore = true;
    };
  }, []);

  const featuredPdf = useMemo(() => landingPdfs[0], [landingPdfs]);

  const handleDashboardNavigation = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role === "admin") {
      navigate("/admin");
      return;
    }

    navigate(user.hasSubscription ? "/dashboard" : "/subscription/buy");
  };

  const handleGetStarted = () => {
    if (user) {
      handleDashboardNavigation();
      return;
    }

    navigate("/signup");
  };

  return (
    <div className="min-h-screen dark bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_40%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.12),transparent_40%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:py-10">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-14 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
        >
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            DocVault
          </h1>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  <UserCircle className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
              <Button
                onClick={() => navigate("/profile")}
                className="font-semibold"
              >
                Profile
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/signup")}>
                Signup
              </Button>
              <Button
                onClick={() => navigate("/login")}
                className="font-semibold"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.header>

        <section className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Secure PDF Reader
            </span>

            <h2 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              A focused space to
              <br />
              read PDFs securely.
            </h2>

            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
              Give users instant clarity that your website is built for
              protected PDF reading. Blurred preview, clean access flow, and
              dashboard-ready experience.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={handleGetStarted}>
                {user ? "Open Your Dashboard" : "Get Started"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleDashboardNavigation}
              >
                {user ? "Open Dashboard" : "Go to Dashboard"}
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Auth-protected routes
              </span>
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-accent" />
                Secure blurred preview
              </span>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="relative"
          >
            <div className="rounded-3xl border border-border bg-card p-4 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold truncate pr-3">
                  {featuredPdf?.title || "Weekly Research Report.pdf"}
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
                  {featuredPdf?.locked ? "Locked" : "View Only"}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/35 p-5 md:p-6">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/25 to-background/45 pointer-events-none" />
                <div
                  className={`space-y-3 select-none opacity-85 ${featuredPdf?.locked ? "blur-[2.2px]" : "blur-0"}`}
                >
                  <div className="h-3 rounded bg-muted w-10/12" />
                  <div className="h-3 rounded bg-muted w-9/12" />
                  <div className="h-3 rounded bg-muted w-11/12" />
                  <div className="h-3 rounded bg-muted w-7/12" />
                  <div className="h-3 rounded bg-muted w-10/12" />
                  <div className="h-3 rounded bg-muted w-8/12" />
                  <div className="h-3 rounded bg-muted w-9/12" />
                  <div className="h-3 rounded bg-muted w-6/12" />
                </div>
                {featuredPdf?.locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1.8px]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                      <Lock className="h-3.5 w-3.5" /> Locked
                    </span>
                  </div>
                )}
                <div className="mt-5 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-foreground/80">
                  {featuredPdf?.locked
                    ? "Preview stays blurred until authenticated access."
                    : "This PDF is visible on the landing page."}
                </div>
              </div>
            </div>
          </motion.section>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-bold tracking-tight">Latest PDFs</h3>
            <Button variant="outline" size="sm" onClick={handleGetStarted}>
              {user ? "Open Dashboard" : "Unlock All"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoadingLandingPdfs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-card p-5 animate-pulse"
                >
                  <div className="h-4 w-3/4 rounded bg-muted mb-4" />
                  <div className="h-20 rounded bg-muted mb-3" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : landingPdfs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {landingPdfs.slice(0, 6).map((pdf, index) => (
                <motion.article
                  key={pdf.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`rounded-2xl border border-border bg-card p-5 ${pdf.locked ? "opacity-95" : "cursor-pointer hover:border-primary/40 transition-colors"}`}
                  onClick={() => {
                    if (!pdf.locked) {
                      setViewingPdf(pdf);
                    }
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold truncate">
                      {pdf.title}
                    </h4>
                    {pdf.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-1 text-[10px] uppercase tracking-wide text-primary">
                        Open
                      </span>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/35 p-4 mb-4">
                    <div
                      className={`space-y-2 ${pdf.locked ? "blur-[2.5px]" : "blur-0"}`}
                    >
                      <div className="h-2.5 rounded bg-muted w-11/12" />
                      <div className="h-2.5 rounded bg-muted w-9/12" />
                      <div className="h-2.5 rounded bg-muted w-10/12" />
                      <div className="h-2.5 rounded bg-muted w-8/12" />
                    </div>
                    {pdf.locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
                        <span className="rounded-full border border-border bg-background/85 px-3 py-1 text-xs font-medium">
                          Locked Preview
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {pdf.uploadedBy}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {pdf.uploadedAt}
                    </span>
                  </div>
                  {!pdf.locked && (
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        setViewingPdf(pdf);
                      }}
                    >
                      Read Now
                    </Button>
                  )}
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
              No PDFs available right now.
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            "10k+ Secure Reads",
            "99.9% Access Reliability",
            "Role-Based Controls",
          ].map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-card px-5 py-4 text-sm font-medium"
            >
              {item}
            </motion.div>
          ))}
        </section>

        <section className="mt-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <p className="text-primary text-sm font-semibold">Features</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight">
              Clean, practical, and conversion-ready
            </h3>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <h4 className="mt-4 text-lg font-semibold">{feature.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mt-20 mb-10 rounded-3xl border border-primary/35 bg-primary/10 p-7 md:p-10 text-center">
          <h3 className="text-3xl font-bold tracking-tight">
            Ready to start reading securely?
          </h3>
          <p className="mt-3 text-muted-foreground">
            Sign in now and jump into your document dashboard.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/login")}>
              Login
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>
              Create Account
            </Button>
            <Button variant="outline" onClick={handleDashboardNavigation}>
              {user ? "Go to Dashboard" : "Open Dashboard"}
            </Button>
          </div>
        </section>

        <footer className="border-t border-border py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>DocVault © 2026. Secure PDF Vault.</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => navigate("/signup")}
            >
              Signup
            </button>
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={handleDashboardNavigation}
            >
              Dashboard
            </button>
          </div>
        </footer>

        {viewingPdf && (
          <PdfViewer pdf={viewingPdf} onClose={() => setViewingPdf(null)} />
        )}
      </div>
    </div>
  );
};

export default Index;
