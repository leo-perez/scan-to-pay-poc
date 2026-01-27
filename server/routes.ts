
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { seedDatabase } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed data on startup
  await seedDatabase();

  // --- Payment Routes ---

  // List payments (for Merchant Dashboard)
  app.get(api.payments.list.path, async (req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  // Get single payment status
  app.get(api.payments.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const payment = await storage.getPayment(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.json(payment);
  });

  // Create Payment Intent
  app.post(api.payments.create.path, async (req, res) => {
    try {
      const input = api.payments.create.input.parse(req.body);

      // 1. Create record in DB as 'pending'
      const payment = await storage.createPayment({
        ...input,
        status: "pending",
      });

      // 2. Call BlinkPay API (Mocking for PoC if no keys)
      // If we had keys, we'd use the SDK here.
      const hasBlinkPayKeys = process.env.BLINKPAY_CLIENT_ID && process.env.BLINKPAY_CLIENT_SECRET;
      
      let redirectUri = "";

      if (hasBlinkPayKeys) {
        // --- REAL BLINKPAY INTEGRATION (Skeleton) ---
        // const client = new BlinkDebitClient(axios);
        // const request = {
        //   flow: {
        //     detail: {
        //       type: AuthFlowDetailTypeEnum.Gateway,
        //       redirectUri: `${req.protocol}://${req.get('host')}/confirmation/${payment.id}`
        //     }
        //   },
        //   amount: {
        //     currency: AmountCurrencyEnum.NZD,
        //     total: input.amount.toString()
        //   },
        //   pcr: {
        //     particulars: 'ReplitPoC',
        //     code: 'PAYMENT',
        //     reference: input.reference || `Ref-${payment.id}`
        //   }
        // };
        // const qpResponse = await client.createQuickPayment(request);
        // await storage.updatePaymentStatus(payment.id, "pending", qpResponse.quickPaymentId);
        // redirectUri = qpResponse.redirectUri;
        
        console.log("BlinkPay keys present but SDK not fully wired in this PoC step. Falling back to mock.");
        // For now, even with keys, we might fallback if SDK isn't installed yet.
        // We will simulate a redirect for the PoC.
      } 
      
      // --- MOCK BEHAVIOR ---
      // Simulate a "gateway" URL that just redirects back to confirmation with success
      // In a real app, this would be the BlinkPay URL.
      // We'll create a special mock route to simulate the user "paying" at the bank.
      const mockGatewayUrl = `/api/mock-blinkpay-gateway?paymentId=${payment.id}`;
      redirectUri = mockGatewayUrl;

      res.status(201).json({ 
        paymentId: payment.id, 
        redirectUri 
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // --- Webhooks (or Mock Gateway) ---

  // Mock Gateway Route (Simulates the Bank/BlinkPay page)
  app.get("/api/mock-blinkpay-gateway", async (req, res) => {
    const paymentId = parseInt(req.query.paymentId as string);
    
    // Simulate some delay then "success"
    // In real flow, BlinkPay would send a webhook or we'd poll.
    // Here we just update DB to success immediately for the PoC demo.
    if (!isNaN(paymentId)) {
      await storage.updatePaymentStatus(paymentId, "completed", `mock-bp-${Date.now()}`);
    }

    // Redirect user back to the app's confirmation page
    res.redirect(`/confirmation/${paymentId}`);
  });

  return httpServer;
}
