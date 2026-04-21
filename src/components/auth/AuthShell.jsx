import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";

const AuthShell = ({
  headerLabel,
  sideIcon: SideIcon,
  sideTitle,
  sideDescription,
  sideHighlights = [],
  children,
  formClassName = "max-w-md",
}) => {
  return (
    <div className="min-h-screen dark bg-background text-foreground overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.12),transparent_35%)]" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-6xl px-6 py-8 md:py-10">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <span className="text-sm text-muted-foreground">{headerLabel}</span>
        </header>

        <div className="grid min-h-[calc(100vh-9rem)] items-center gap-8 lg:grid-cols-2">
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-card p-8 shadow-sm"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {SideIcon ? <SideIcon className="h-7 w-7" /> : null}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{sideTitle}</h1>
              <p className="mt-3 max-w-md text-muted-foreground">
                {sideDescription}
              </p>

              <div className="mt-8 space-y-3">
                {sideHighlights.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.text}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/35 px-4 py-3"
                    >
                      {ItemIcon ? (
                        <ItemIcon
                          className={`h-5 w-5 ${item.iconClassName || "text-primary"}`}
                        />
                      ) : null}
                      <p className="text-sm">{item.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    Quarterly-report.pdf
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    Protected
                  </span>
                </div>
                <div className="space-y-2 blur-[1.8px] select-none opacity-85">
                  <div className="h-2 rounded bg-muted w-11/12" />
                  <div className="h-2 rounded bg-muted w-9/12" />
                  <div className="h-2 rounded bg-muted w-10/12" />
                  <div className="h-2 rounded bg-muted w-8/12" />
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Secure preview before access
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`w-full ${formClassName} rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm`}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
