import { useState } from "react";
import { useCreatePayment } from "@/hooks/use-payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function CustomerCheckout() {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const { mutate, isPending } = useCreatePayment();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    mutate(
      { 
        amount, 
        reference: reference || "Walk-in Customer",
        description: "Scan to Pay Transaction"
      },
      {
        onSuccess: (data) => {
          // Check if we're in an iframe (Replit webview)
          const isInIframe = window.self !== window.top;
          
          if (isInIframe) {
            // In iframe: open in new tab to bypass BlinkPay iframe restrictions
            window.open(data.redirectUri, "_blank");
          } else {
            // Direct access (mobile/desktop): use standard redirect
            window.location.href = data.redirectUri;
          }
        },
        onError: (error) => {
          toast({
            title: "Payment Initialization Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in">
        
        {/* Brand Header */}
        <div className="bg-primary/5 p-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary mb-2">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold font-display text-gray-900">Make a Payment</h1>
            <p className="text-muted-foreground text-sm">Secure checkout via BlinkPay</p>
          </div>
        </div>

        <div className="px-8 py-8 -mt-6 bg-white rounded-t-[2rem] relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-semibold text-gray-700 ml-1">
                Amount (NZD)
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg group-focus-within:text-primary transition-colors">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-100 text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reference" className="text-sm font-semibold text-gray-700 ml-1">
                Reference <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="reference"
                type="text"
                placeholder="Order #123 or Name"
                className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-100 font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full font-bold text-lg h-16 rounded-2xl group"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Pay Now <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Payments secured by Open Banking API</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
