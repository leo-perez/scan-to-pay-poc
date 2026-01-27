import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { seedDatabase } from "./seed";
import { createQuickPayment, getQuickPaymentStatus, isBlinkPayConfigured } from "./blinkpay";

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
    const idParam = req.params.id;
    const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const payment = await storage.getPayment(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // If payment has a BlinkPay ID and is still pending, check status with BlinkPay
    if (payment.blinkPayId && payment.status === "pending" && isBlinkPayConfigured()) {
      try {
        const blinkStatus = await getQuickPaymentStatus(payment.blinkPayId);
        if (blinkStatus.status !== payment.status) {
          const updated = await storage.updatePaymentStatus(id, blinkStatus.status);
          return res.json(updated);
        }
      } catch (err) {
        console.error("Error checking BlinkPay status:", err);
      }
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

      // 2. Determine redirect URI based on environment
      const protocol = req.get("x-forwarded-proto") || req.protocol;
      const host = req.get("host");
      const confirmationUrl = `${protocol}://${host}/confirmation/${payment.id}`;

      let redirectUri = "";

      // 3. Determine if we should use mock mode
      // USE_MOCK_PAYMENT=true enables mock mode for development/testing
      const useMockMode = process.env.USE_MOCK_PAYMENT === "true";

      if (useMockMode) {
        // Explicit mock mode for development
        console.log("Mock mode enabled, using mock gateway");
        redirectUri = `/api/mock-blinkpay-gateway?paymentId=${payment.id}`;
      } else if (isBlinkPayConfigured()) {
        // Real BlinkPay integration
        try {
          console.log("Creating BlinkPay quick payment...");
          const blinkResponse = await createQuickPayment({
            amount: input.amount.toString(),
            reference: input.reference || `Payment-${payment.id}`,
            redirectUri: confirmationUrl,
          });

          // Update payment with BlinkPay ID
          await storage.updatePaymentStatus(payment.id, "pending", blinkResponse.quickPaymentId);
          redirectUri = blinkResponse.redirectUri;
          console.log("BlinkPay payment created:", blinkResponse.quickPaymentId);
        } catch (err: any) {
          console.error("BlinkPay API error:", err.message);
          // In production, fail the request rather than falling back to mock
          await storage.updatePaymentStatus(payment.id, "failed");
          return res.status(502).json({ 
            message: "Payment gateway error. Please try again later." 
          });
        }
      } else {
        // No BlinkPay configured and not in mock mode - error
        console.error("BlinkPay not configured and mock mode disabled");
        await storage.updatePaymentStatus(payment.id, "failed");
        return res.status(503).json({ 
          message: "Payment service not available" 
        });
      }

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

  // --- Mock Gateway (Fallback for testing without BlinkPay) ---

  app.get("/api/mock-blinkpay-gateway", async (req, res) => {
    const paymentId = parseInt(req.query.paymentId as string);
    
    if (!isNaN(paymentId)) {
      await storage.updatePaymentStatus(paymentId, "completed", `mock-bp-${Date.now()}`);
    }

    res.redirect(`/confirmation/${paymentId}`);
  });

  return httpServer;
}
