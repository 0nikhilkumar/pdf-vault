import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, FileText, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePdfs } from "@/contexts/PdfContext";
import Layout from "@/components/Layout";
import PdfCard from "@/components/PdfCard";
import PdfViewer from "@/components/PdfViewer";
import { Input } from "@/components/ui/input";

const UserDashboard = () => {
  const { user } = useAuth();
  const { pdfs, isLoadingPdfs } = usePdfs();
  const [viewingPdf, setViewingPdf] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = pdfs.filter((pdf) =>
    pdf.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          PDF Library
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Browse and view available documents
        </p>
      </div>

      {!user?.hasSubscription && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3"
        >
          <Crown className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Upgrade to Pro to unlock all documents
            </p>
            <p className="text-xs text-muted-foreground">
              Contact an admin to activate your subscription
            </p>
          </div>
        </motion.div>
      )}

      <div className="relative mb-4 md:mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10 h-10 md:h-11"
        />
      </div>

      <div className="flex gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
        <div className="glass rounded-lg px-3 md:px-4 py-2 md:py-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs md:text-sm text-foreground font-medium">
            {pdfs.length} Documents
          </span>
        </div>
      </div>

      {isLoadingPdfs ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm md:text-base">Loading documents...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
          {filtered.map((pdf, index) => (
            <PdfCard
              key={pdf.id}
              pdf={pdf}
              onView={setViewingPdf}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm md:text-base">No documents found</p>
        </div>
      )}

      {viewingPdf && (
        <PdfViewer pdf={viewingPdf} onClose={() => setViewingPdf(null)} />
      )}
    </Layout>
  );
};

export default UserDashboard;
