import { useState, useMemo } from "react";
import { usePayments } from "@/hooks/use-payments";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { Store, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MerchantDashboard() {
  const { data: payments, isLoading } = usePayments();
  const [qrAmount, setQrAmount] = useState("");
  const [qrReference, setQrReference] = useState("");

  const checkoutUrl = useMemo(() => {
    const base = `${window.location.origin}/checkout`;
    const params = new URLSearchParams();
    if (qrAmount && !isNaN(Number(qrAmount)) && Number(qrAmount) > 0) {
      params.set("amount", qrAmount);
    }
    if (qrReference.trim()) {
      params.set("reference", qrReference.trim());
    }
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }, [qrAmount, qrReference]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                <Store className="w-6 h-6" />
              </div>
              Merchant Dashboard
            </h1>
            <p className="text-muted-foreground pl-14">Live transaction monitoring & payment gateway</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm text-sm text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            System Live
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* QR Code Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center space-y-6 sticky top-8">
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-display">Generate Payment QR</h2>
                <p className="text-sm text-muted-foreground">Create a QR code for a specific amount</p>
              </div>

              <div className="w-full space-y-4">
                <div className="space-y-2 text-left">
                  <label htmlFor="qr-amount" className="text-sm font-semibold text-gray-700">
                    Amount (NZD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      id="qr-amount"
                      data-testid="input-qr-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      value={qrAmount}
                      onChange={(e) => setQrAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label htmlFor="qr-reference" className="text-sm font-semibold text-gray-700">
                    Reference <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="qr-reference"
                    data-testid="input-qr-reference"
                    type="text"
                    placeholder="Order #123"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    value={qrReference}
                    onChange={(e) => setQrReference(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
                <div className="w-full aspect-square max-w-[180px] flex items-center justify-center">
                  <QRCode
                    value={checkoutUrl}
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>

              {qrAmount && Number(qrAmount) > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">${Number(qrAmount).toFixed(2)} NZD</div>
                  {qrReference && <div className="text-sm text-muted-foreground">{qrReference}</div>}
                </div>
              )}

              <div className="w-full bg-gray-50 p-3 rounded-xl text-xs font-mono break-all text-gray-500 border border-gray-100">
                {checkoutUrl}
              </div>

              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-clear-qr"
                onClick={() => { setQrAmount(""); setQrReference(""); }}
                className="w-full"
              >
                Clear & Reset
              </Button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display">Recent Transactions</h2>
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              {!payments || payments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-300" />
                  </div>
                  <p>No transactions yet.</p>
                  <p className="text-sm">Payments will appear here instantly.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-12 h-12 rounded-2xl flex items-center justify-center
                          ${payment.status === 'completed' ? 'bg-green-100 text-green-600' : 
                            payment.status === 'failed' ? 'bg-red-100 text-red-600' : 
                            'bg-amber-100 text-amber-600'}
                        `}>
                          {payment.status === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                          {payment.status === 'failed' && <XCircle className="w-6 h-6" />}
                          {payment.status === 'pending' && <Clock className="w-6 h-6" />}
                        </div>
                        
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {payment.reference || "No Reference"}
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                              {payment.currency}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.createdAt && format(payment.createdAt, "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold font-display tabular-nums tracking-tight">
                          ${payment.amount}
                        </div>
                        <div className={`text-xs font-medium capitalize ${
                          payment.status === 'completed' ? 'text-green-600' : 
                          payment.status === 'failed' ? 'text-red-600' : 
                          'text-amber-600'
                        }`}>
                          {payment.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
