import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileLock2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedIdentifier = identifier.trim();
    if (!cleanedIdentifier || !password) {
      toast({
        title: "Missing details",
        description: "Please enter your email/username and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await login(cleanedIdentifier, password);

    if (result.success) {
      const currentUser = result.user;
      if (currentUser?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Login failed",
      description: result.message || "Invalid credentials",
      variant: "destructive",
    });

    setIsSubmitting(false);
  };

  return (
    <AuthShell
      headerLabel="Secure Sign In"
      sideIcon={FileText}
      sideTitle="DocVault"
      sideDescription="Enter your credentials to access your protected PDF dashboard. Read files securely with controlled access."
      sideHighlights={[
        {
          icon: ShieldCheck,
          text: "Role-based access for user and admin areas",
          iconClassName: "text-primary",
        },
        {
          icon: FileLock2,
          text: "Subscription-aware protected document reading",
          iconClassName: "text-accent",
        },
      ]}
      formClassName="max-w-md"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          Welcome back
        </h2>
        <p className="text-muted-foreground mt-1">
          Sign in to open your dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or Username</Label>
          <Input
            id="identifier"
            type="text"
            placeholder="you@example.com or johndoe"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="h-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-11 font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing In..." : "Sign In"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
