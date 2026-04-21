import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Crown,
  Home,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Upload,
  UserCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const getUserDisplayName = (user) => user?.name || "User";

const getAccountLabel = (user, selectedSubscriptionPlan) => {
  if (user?.role === "admin") return "Admin";

  return user?.hasSubscription
    ? selectedSubscriptionPlan?.name || "Active Plan"
    : "Free Plan";
};

const getSidebarItems = (isAdmin) => {
  if (isAdmin) {
    return [
      { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
      {
        path: "/admin/registered-users",
        label: "Registered Users",
        icon: Users,
      },
      {
        path: "/admin/subscribed-users",
        label: "Subscribed Users",
        icon: Crown,
      },
      { path: "/admin/upload", label: "Upload PDF", icon: Upload },
    ];
  }

  return [
    { path: "/dashboard", label: "Library", icon: FileText },
    { path: "/subscription/buy", label: "Subscription", icon: Crown },
    { path: "/profile", label: "Profile", icon: UserCircle },
  ];
};

const SidebarItem = ({ item, active }) => {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </motion.div>
  );
};

const AccountSummary = ({
  user,
  selectedSubscriptionPlan,
  compact = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "px-2"}`}>
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
        {getUserDisplayName(user).charAt(0)}
      </div>
      <div className={`flex-1 min-w-0 ${compact ? "text-right" : ""}`}>
        <p className="truncate text-sm font-medium text-foreground">
          {getUserDisplayName(user)}
        </p>
        <p className="truncate text-xs text-accent">
          {getAccountLabel(user, selectedSubscriptionPlan)}
        </p>
      </div>
    </div>
  );
};

const ColorModeToggle = ({ dark, onToggle }) => {
  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

const Layout = ({ children }) => {
  const { user, logout, selectedSubscriptionPlan } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const isAdmin = user?.role === "admin";
  const navItems = getSidebarItems(isAdmin);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="w-64 border-r border-border bg-card flex flex-col fixed h-screen z-30"
      >
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              DocVault
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <SidebarItem item={item} active={active} />
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <AccountSummary
            user={user}
            selectedSubscriptionPlan={selectedSubscriptionPlan}
          />
          <div className="flex gap-2">
            <ColorModeToggle
              dark={isDarkMode}
              onToggle={() => setIsDarkMode((prev) => !prev)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex-1 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 ml-64">
        <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-4 px-8 py-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Landing page
            </Link>
            <div className="rounded-full border border-border bg-card px-3 py-2">
              <AccountSummary
                user={user}
                selectedSubscriptionPlan={selectedSubscriptionPlan}
                compact
              />
            </div>
          </div>
        </div>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
