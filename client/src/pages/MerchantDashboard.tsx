import { usePayments } from "@/hooks/use-payments";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { Store, RefreshCw, ArrowUpRight, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function MerchantDashboard() {
  const { data: payments, isLoading } = usePayments();
  const checkoutUrl = `${window.location.origin}/checkout`;

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
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center space-y-8 sticky top-8">
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-display">Scan to Pay</h2>
                <p className="text-sm text-muted-foreground">Show this code to customers</p>
              </div>
              
              <div className="p-6 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-inner">
                <div className="w-full aspect-square max-w-[200px] flex items-center justify-center">
                  <QRCode
                    value={checkoutUrl}
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>
              </div>

              <div className="w-full bg-gray-50 p-4 rounded-xl text-xs font-mono break-all text-gray-500 border border-gray-100">
                {checkoutUrl}
              </div>
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
