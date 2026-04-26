import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PdfProvider } from "@/contexts/PdfContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import UserUpload from "./pages/UserUpload";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminUpload from "./pages/AdminUpload";
import AdminPlans from "./pages/AdminPlans";
import AdminGiveSubscription from "./pages/AdminGiveSubscription";
import NotFound from "./pages/NotFound";
import SubscriptionBuy from "./pages/SubscriptionBuy";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import Profile from "./pages/Profile";

const getUserHomePath = (user) => {
  if (user?.role === "admin") return "/admin";
  return "/dashboard";
};

const ProtectedRoute = ({ children, role, requireSubscription = false }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  if (requireSubscription && user.role !== "admin" && !user.hasSubscription) {
    return <Navigate to="/subscription/buy" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <PdfProvider>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="user">
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute role="user">
                  <UserUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription/buy"
              element={
                <ProtectedRoute role="user">
                  <SubscriptionBuy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription/success"
              element={
                <ProtectedRoute role="user">
                  <SubscriptionSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription/cancel"
              element={
                <ProtectedRoute role="user">
                  <SubscriptionCancel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute role="user">
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <Navigate to="/admin/registered-users" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/registered-users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscribed-users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/upload"
              element={
                <ProtectedRoute role="admin">
                  <AdminUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscription-plans"
              element={
                <ProtectedRoute role="admin">
                  <AdminPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/give-subscription"
              element={
                <ProtectedRoute role="admin">
                  <AdminGiveSubscription />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PdfProvider>
    </AuthProvider>
  );
};

export default App;
