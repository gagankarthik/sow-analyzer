import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

/* Data, sign-in, tooltips and toasts for the signed-in app and the account
   pages. The public site does not need them, so they are not in the root
   layout: marketing pages ship without the Cognito and query libraries. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </AuthProvider>
      </QueryProvider>
      <Toaster richColors closeButton position="bottom-right" />
    </>
  );
}
