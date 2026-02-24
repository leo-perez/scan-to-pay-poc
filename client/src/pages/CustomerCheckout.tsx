import { useState } from "react";
import { useCreatePayment, useBanks } from "@/hooks/use-payments";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ShoppingBag, ShieldCheck, ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import anzLogo from "@assets/Logo_Bank_ANZ_1770245105760.png";
import asbLogo from "@assets/Logo_Bank_ASB_1770245105761.png";
import bnzLogo from "@assets/Logo_Bank_BNZ_1770245105762.png";
import pnzLogo from "@assets/Logo_Bank_The_Co-operative_Bank_1770245105762.png";

const bankLogos: Record<string, string> = {
  ANZ: anzLogo,
  ASB: asbLogo,
  BNZ: bnzLogo,
  PNZ: pnzLogo,
};

type CheckoutStep = "amount" | "bank" | "redirecting";

export default function CustomerCheckout() {
  const [step, setStep] = useState<CheckoutStep>("amount");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [, navigate] = useLocation();
  
  const { mutate, isPending } = useCreatePayment();
  const { data: banks, isLoading: banksLoading } = useBanks();
  const { toast } = useToast();

  const handleAmountContinue = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    setStep("bank");
  };

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
  };

  const handleConfirmPayment = () => {
    if (!selectedBank) {
      toast({
        title: "Select a Bank",
        description: "Please select your bank to continue.",
        variant: "destructive",
      });
      return;
    }

    setStep("redirecting");

    mutate(
      { 
        amount, 
        reference: reference || "Walk-in Customer",
        description: "Scan to Pay Transaction",
        bank: selectedBank,
      },
      {
        onSuccess: (data) => {
          sessionStorage.setItem(
            `blinkpay_redirect_${data.paymentId}`,
            data.redirectUri
          );
          navigate(`/confirmation/${data.paymentId}`);
        },
        onError: (error) => {
          setStep("bank");
          toast({
            title: "Payment Initialization Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleBack = () => {
    if (step === "bank") {
      setStep("amount");
      setSelectedBank(null);
    }
  };

  const formatAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden animate-in">
        
        <div className="bg-primary/5 p-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center text-primary mb-2">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold font-display text-gray-900">
              {step === "amount" && "Make a Payment"}
              {step === "bank" && "Select Your Bank"}
              {step === "redirecting" && "Connecting..."}
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === "amount" && "Secure checkout via BlinkPay"}
              {step === "bank" && formatAmount(amount)}
              {step === "redirecting" && "Redirecting to your bank"}
            </p>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {["amount", "bank", "redirecting"].map((s, idx) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === s ? "bg-primary w-6" : 
                  (step === "bank" && idx === 0) || (step === "redirecting" && idx <= 1) 
                    ? "bg-primary/50" 
                    : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-8 py-8 -mt-6 bg-white rounded-t-[2rem] relative z-10">
          
          {step === "amount" && (
            <form onSubmit={handleAmountContinue} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-semibold text-gray-700 ml-1">
                  Amount (NZD)
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg group-focus-within:text-primary transition-colors">$</span>
                  <input
                    id="amount"
                    data-testid="input-amount"
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
                  data-testid="input-reference"
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
                  data-testid="button-continue-to-bank"
                  className="w-full font-bold text-lg h-16 rounded-2xl group"
                >
                  Continue <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Payments secured by Open Banking API</span>
              </div>
            </form>
          )}

          {step === "bank" && (
            <div className="space-y-6">
              <button 
                onClick={handleBack}
                data-testid="button-back-to-amount"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="space-y-3">
                {banksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  banks?.map((bank) => (
                    <button
                      key={bank.id}
                      data-testid={`button-bank-${bank.id}`}
                      onClick={() => handleBankSelect(bank.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                        selectedBank === bank.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-100 hover:border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white border border-gray-200 overflow-hidden">
                        {bankLogos[bank.id] ? (
                          <img 
                            src={bankLogos[bank.id]} 
                            alt={bank.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-500">{bank.id}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{bank.name}</div>
                        <div className="text-sm text-muted-foreground">Open Banking</div>
                      </div>
                      {selectedBank === bank.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleConfirmPayment}
                  size="lg" 
                  data-testid="button-confirm-payment"
                  className="w-full font-bold text-lg h-16 rounded-2xl group"
                  disabled={!selectedBank || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Pay {formatAmount(amount)} <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                <ShieldCheck className="w-4 h-4" />
                <span>You'll be redirected to your bank to authorize</span>
              </div>
            </div>
          )}

          {step === "redirecting" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-1">Connecting to your bank</h3>
                <p className="text-sm text-muted-foreground">Please wait while we redirect you...</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
