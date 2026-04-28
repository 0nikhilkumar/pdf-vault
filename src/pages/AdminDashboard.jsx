import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, FileText, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PdfViewer from "@/components/PdfViewer";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { buildApiUrl, parseJsonSafely, withAuthHeader } from "@/lib/api";

const StatCard = ({ icon: Icon, label, value, accent, delay, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass rounded-xl p-4 md:p-6 ${accent ? "border-primary/30 glow-primary" : ""} ${
        onClick
          ? "cursor-pointer hover:border-primary/40 transition-colors"
          : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div
          className={`h-9 md:h-10 w-9 md:w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            accent
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 md:h-5 w-4 md:w-5" />
        </div>
        <span className="text-xs md:text-sm text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    subscribedUsers: 0,
    subscribedRate: 0,
  });
  const [pdfs, setPdfs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingPdf, setViewingPdf] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        const [rateResponse, pdfResponse] = await Promise.all([
          fetch(buildApiUrl("/admin/subscribed-rate"), {
            method: "GET",
            credentials: "include",
            headers: withAuthHeader(accessToken),
          }),
          fetch(buildApiUrl("/admin/pdfs"), {
            method: "GET",
            credentials: "include",
            headers: withAuthHeader(accessToken),
          }),
        ]);

        const [ratePayload, pdfPayload] = await Promise.all([
          parseJsonSafely(rateResponse),
          parseJsonSafely(pdfResponse),
        ]);

        if (!isMounted) return;

        if (rateResponse.ok) {
          setStats({
            totalUsers: Number(ratePayload?.totalUsers || 0),
            subscribedUsers: Number(ratePayload?.subscribedUsers || 0),
            subscribedRate: Number(ratePayload?.subscribedRate || 0),
          });
        }

        if (pdfResponse.ok) {
          setPdfs(Array.isArray(pdfPayload?.pdfs) ? pdfPayload.pdfs : []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const recentPdfs = useMemo(() => pdfs.slice(0, 5), [pdfs]);

  return (
    <Layout>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Overview of your platform
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8 md:mb-10">
        <StatCard
          icon={Users}
          label="Registered Users"
          value={stats.totalUsers}
          delay={0}
          onClick={() => navigate("/admin/registered-users")}
        />
        <StatCard
          icon={Crown}
          label="Subscribed Users"
          value={stats.subscribedUsers}
          accent
          delay={0.1}
          onClick={() => navigate("/admin/subscribed-users")}
        />
        <StatCard
          icon={FileText}
          label="Total PDFs"
          value={pdfs.length}
          delay={0.2}
        />
        <StatCard
          icon={TrendingUp}
          label="Sub Rate"
          value={`${stats.subscribedRate.toFixed(2)}%`}
          delay={0.3}
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border">
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            Recent Documents
          </h2>
        </div>
        <div className="divide-y divide-border">
          {isLoading && (
            <div className="px-4 md:px-6 py-4 text-sm text-muted-foreground">
              Loading recent documents...
            </div>
          )}
          {!isLoading && recentPdfs.length === 0 && (
            <div className="px-4 md:px-6 py-4 text-sm text-muted-foreground">
              No documents available
            </div>
          )}
          {recentPdfs.map((pdf) => (
            <div
              key={pdf._id}
              className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground truncate">
                  {pdf.title || pdf.originalName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-muted-foreground">
                <span className="truncate">{pdf.uploadedBy || "Admin"}</span>
                <span className="whitespace-nowrap">
                  {formatDate(pdf.createdAt || Date.now())}
                </span>
                <span className="whitespace-nowrap">
                  {pdf.locked ? "Locked" : "Open"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingPdf(pdf)}
                  className="h-8 ml-2"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {viewingPdf && (
        <PdfViewer pdf={viewingPdf} onClose={() => setViewingPdf(null)} />
      )}
    </Layout>
  );
};

export default AdminDashboard;
