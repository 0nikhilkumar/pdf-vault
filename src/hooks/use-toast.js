import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: ({ title, description, variant }) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description });
        return;
      }
      sonnerToast.success(title, { description });
    },
  };
}
