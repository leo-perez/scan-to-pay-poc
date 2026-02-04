import { Link } from "wouter";
import { Store, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-4xl w-full text-center space-y-12 z-10 animate-in">
        <div className="space-y-6">
          <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Pay<span className="text-primary">Fast</span>.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            A seamless scan-to-pay proof of concept powered by BlinkPay Open Banking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Merchant Card */}
          <Link href="/merchant" className="group">
            <div className="h-full bg-card hover:bg-card/50 border border-border/50 hover:border-primary/50 p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center space-y-6 bg-white/60 backdrop-blur-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Store className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Merchant Dashboard</h3>
                <p className="text-muted-foreground">Monitor transactions live and display your payment QR code.</p>
              </div>
              <div className="pt-4">
                <span className="text-primary font-semibold flex items-center gap-2">
                  Launch Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>

          {/* Customer Card */}
          <Link href="/checkout" className="group">
            <div className="h-full bg-card hover:bg-card/50 border border-border/50 hover:border-accent/50 p-8 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center space-y-6 bg-white/60 backdrop-blur-sm">
              <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Customer Checkout</h3>
                <p className="text-muted-foreground">Simulate a customer scanning a code to make a secure payment.</p>
              </div>
              <div className="pt-4">
                <span className="text-accent font-semibold flex items-center gap-2">
                  Start Payment <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
