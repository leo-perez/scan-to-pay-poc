import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { seedDatabase } from "./seed";
import { createQuickPayment, getQuickPaymentStatus, isBlinkPayConfigured, getAvailableBanks, mapBlinkPayStatus } from "./blinkpay";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed data on startup
  await seedDatabase();

  // --- Banks Route ---
  app.get(api.banks.list.path, async (req, res) => {
    // Return mock banks if BlinkPay not configured
    if (!isBlinkPayConfigured()) {
      const mockBanks = [
        { id: "ANZ", name: "ANZ Bank" },
        { id: "ASB", name: "ASB Bank" },
        { id: "BNZ", name: "Bank of New Zealand" },
        { id: "Westpac", name: "Westpac NZ" },
      ];
      return res.json(mockBanks);
    }

    try {
      const banks = await getAvailableBanks();
      res.json(banks);
    } catch (err) {
      console.error("Failed to fetch banks:", err);
      res.status(503).json({ message: "Failed to retrieve available banks" });
    }
  });

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
      // Use APP_BASE_URL if set (for production), otherwise detect from request
      let confirmationUrl: string;
      if (process.env.APP_BASE_URL) {
        confirmationUrl = `${process.env.APP_BASE_URL}/confirmation/${payment.id}`;
      } else {
        const protocol = req.get("x-forwarded-proto") || req.protocol;
        const host = req.get("host");
        confirmationUrl = `${protocol}://${host}/confirmation/${payment.id}`;
      }

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
            bank: input.bank,
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

  // --- BlinkPay Webhook ---
  app.post("/api/webhooks/blinkpay", async (req, res) => {
    try {
      console.log("BlinkPay webhook received:", JSON.stringify(req.body, null, 2));

      const quickPaymentId = req.body?.quick_payment_id;
      const consentStatus = req.body?.status;

      if (!quickPaymentId) {
        console.warn("Webhook: Missing quick_payment_id");
        return res.status(200).json({ message: "OK" });
      }

      const payment = await storage.getPaymentByBlinkPayId(quickPaymentId);

      if (!payment) {
        console.warn(`Webhook: No payment found for BlinkPay ID ${quickPaymentId}`);
        return res.status(200).json({ message: "OK" });
      }

      if (consentStatus) {
        const mappedStatus = mapBlinkPayStatus(consentStatus);
        if (mappedStatus !== "pending" && mappedStatus !== payment.status) {
          await storage.updatePaymentStatus(payment.id, mappedStatus);
          console.log(`Webhook: Updated payment ${payment.id} from ${payment.status} to ${mappedStatus} (consent: ${consentStatus})`);
        }
      }

      res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(200).json({ message: "OK" });
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
