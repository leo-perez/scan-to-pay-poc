import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { usePayment } from "@/hooks/use-payments";
import { Loader2, CheckCircle2, XCircle, Home, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Confirmation() {
  const [, params] = useRoute("/confirmation/:id");
  const id = Number(params?.id);
  const validId = !isNaN(id) && id > 0;
  const { data: payment, isLoading, error } = usePayment(id);
  const [waitTime, setWaitTime] = useState(0);
  const [bankUrl, setBankUrl] = useState<string | null>(null);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (redirectAttempted.current || !id) return;
    redirectAttempted.current = true;

    const storageKey = `blinkpay_redirect_${id}`;
    const redirectUri = sessionStorage.getItem(storageKey);
    if (!redirectUri) return;
    sessionStorage.removeItem(storageKey);

    setBankUrl(redirectUri);

    const popup = window.open(redirectUri, "_blank");
    if (!popup || popup.closed) {
      setBankUrl(redirectUri);
    }
  }, [id]);

  useEffect(() => {
    if (payment?.status === "completed" || payment?.status === "failed") {
      setBankUrl(null);
    }
  }, [payment?.status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!validId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900" data-testid="text-error-title">Invalid Payment</h2>
            <p className="text-muted-foreground mt-2">This payment link is not valid.</p>
          </div>
          <Link href="/checkout">
            <Button variant="outline" className="w-full" data-testid="button-try-again">Start New Payment</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || (!payment && !error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center relative">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900" data-testid="text-loading-title">Verifying Payment</h2>
          <p className="text-muted-foreground mt-2">Please wait while we confirm with your bank...</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900" data-testid="text-error-title">Something went wrong</h2>
            <p className="text-muted-foreground mt-2">We couldn't verify this payment.</p>
          </div>
          <Link href="/checkout">
            <Button variant="outline" className="w-full" data-testid="button-try-again">Try Again</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSuccess = payment.status === "completed";
  const isFailed = payment.status === "failed";
  const isPending = payment.status === "pending";

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
            {isPending && (
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse-slow">
                {waitTime < 15 ? (
                  <Loader2 className="w-12 h-12 animate-spin" />
                ) : (
                  <Clock className="w-12 h-12" />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-gray-900" data-testid="text-confirmation-title">
              {isSuccess ? "Payment Successful!" : isFailed ? "Payment Failed" : waitTime < 15 ? "Processing..." : "Awaiting Bank Confirmation"}
            </h1>
            <p className="text-muted-foreground" data-testid="text-confirmation-message">
              {isSuccess 
                ? "Your transaction has been processed securely." 
                : isFailed 
                ? "Please try again or use a different account."
                : bankUrl
                ? "Please complete the authorization in the bank window. If it didn't open, tap the button below."
                : waitTime < 15
                ? "Waiting for final confirmation..."
                : "Your payment is being processed by your bank. This may take a moment."
              }
            </p>
          </div>

          {isPending && bankUrl && (
            <a
              href={bankUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
              data-testid="link-open-bank"
            >
              <ExternalLink className="w-5 h-5" />
              Open Bank Authorization
            </a>
          )}

          <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-gray-900" data-testid="text-payment-amount">${payment.amount} NZD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium text-gray-900" data-testid="text-payment-reference">{payment.reference || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs text-gray-500 mt-1" data-testid="text-payment-id">{payment.id}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button className="w-full" size="lg" variant={isSuccess ? "default" : "secondary"} data-testid="button-return-home">
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
