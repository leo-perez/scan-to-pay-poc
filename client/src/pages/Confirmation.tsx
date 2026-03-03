import { useRoute, Link } from "wouter";
import { usePayment } from "@/hooks/use-payments";
import { Loader2, CheckCircle2, XCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Component, type ReactNode } from "react";

// Parse payment id from pathname (reliable after redirect from BlinkPay; use URL as source of truth)
function getPaymentIdFromPath(): number | null {
  if (typeof window === "undefined") return null;
  const m = /^\/confirmation\/(\d+)/.exec(window.location.pathname);
  return m ? parseInt(m[1], 10) : null;
}

class ConfirmationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-muted-foreground">The confirmation page couldn’t load. You can go back home.</p>
            <Link href="/">
              <Button className="w-full">Return Home</Button>
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ConfirmationContent() {
  const [, params] = useRoute("/confirmation/:id");
  const idFromUrl = getPaymentIdFromPath();
  const idFromParams = params?.id != null ? Number(params.id) : null;
  const validId = idFromUrl ?? (idFromParams != null && idFromParams > 0 ? idFromParams : null);

  const { data: payment, isLoading, isPending, error } = usePayment(validId ?? 0);

  if (validId == null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Invalid confirmation link</h2>
          <p className="text-muted-foreground">Use the link from your payment or try again.</p>
          <Link href="/">
            <Button className="w-full">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const showLoading = isLoading || (isPending && !payment);
  if (showLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center relative">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Verifying Payment</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm with your bank...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-muted-foreground mt-2">We couldn't verify this payment. {error?.message ?? ""}</p>
          </div>
          <Link href="/checkout">
            <Button variant="outline" className="w-full">Try Again</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSuccess = payment.status === "completed";
  const isFailed = payment.status === "failed";
  const paymentPending = payment.status === "pending";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in">
        <div className={`h-2 w-full ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
        
        <div className="p-8 md:p-12 text-center space-y-8">
          <div className="flex justify-center">
            {isSuccess && (
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            )}
            {isFailed && (
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-in zoom-in duration-300">
                <XCircle className="w-12 h-12" />
              </div>
            )}
            {paymentPending && (
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse-slow">
                <Loader2 className="w-12 h-12 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-gray-900">
              {isSuccess ? "Payment Successful!" : isFailed ? "Payment Failed" : "Processing..."}
            </h1>
            <p className="text-muted-foreground">
              {isSuccess 
                ? "Your transaction has been processed securely." 
                : isFailed 
                ? "Please try again or use a different account."
                : "Waiting for final confirmation…"
              }
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-gray-900">${payment.amount} NZD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium text-gray-900">{payment.reference || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs text-gray-500 mt-1">{payment.id}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button className="w-full" size="lg" variant={isSuccess ? "default" : "secondary"}>
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Confirmation() {
  return (
    <ConfirmationErrorBoundary>
      <ConfirmationContent />
    </ConfirmationErrorBoundary>
  );
}
