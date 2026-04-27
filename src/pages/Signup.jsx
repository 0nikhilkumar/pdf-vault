import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      username: username.trim(),
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    };

    if (
      !payload.username ||
      !payload.email ||
      !payload.firstName ||
      !payload.lastName ||
      !payload.password
    ) {
      toast({
        title: "Missing details",
        description: "Please complete all fields.",
        variant: "destructive",
      });
      return;
    }

    if (payload.password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password should be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const signupResult = await signup(payload);

    if (!signupResult.success) {
      toast({
        title: "Signup failed",
        description: signupResult.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const loginResult = await login(payload.email, payload.password);
    if (!loginResult.success) {
      toast({
        title: "Account created",
        description: "Please log in to continue.",
      });
      navigate("/login");
      setIsSubmitting(false);
      return;
    }

    navigate("/dashboard");
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      headerLabel="Create Account"
      sideIcon={UserPlus}
      sideTitle="Join Export Import"
      sideDescription="Create your account to unlock secure PDF reading with a clean, role-based dashboard experience."
      sideHighlights={[
        {
          icon: ShieldCheck,
          text: "Protected access to your documents",
          iconClassName: "text-primary",
        },
        {
          icon: CheckCircle2,
          text: "Auto sign-in after successful registration",
          iconClassName: "text-accent",
        },
      ]}
      formClassName="max-w-xl"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          Create account
        </h2>
        <p className="text-muted-foreground mt-1">Join Export Import today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="johndoe"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
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
          {isSubmitting ? "Creating Account..." : "Create Account"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default Signup;
