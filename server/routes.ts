import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { seedDatabase } from "./seed";
import { createQuickPayment, getQuickPaymentStatus, isBlinkPayConfigured, getAvailableBanks } from "./blinkpay";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("BlinkPay status check timed out")), ms)
    ),
  ]);
}

let isSyncing = false;

async function syncPendingPayments() {
  if (!isBlinkPayConfigured() || isSyncing) return;
  isSyncing = true;
  try {
    const unresolvedPayments = await storage.getUnresolvedBlinkPayments(10);
    for (const payment of unresolvedPayments) {
      try {
        const blinkStatus = await withTimeout(getQuickPaymentStatus(payment.blinkPayId!), 5000);
        if (blinkStatus.status !== payment.status) {
          await storage.updatePaymentStatus(payment.id, blinkStatus.status);
          console.log(`Background sync: payment ${payment.id} updated to ${blinkStatus.status}`);
        }
      } catch (err) {
        console.error(`Background sync: failed to check payment ${payment.id}:`, err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("Background sync error:", err);
  } finally {
    isSyncing = false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("[server] Seeding database...");
  await seedDatabase();
  console.log("[server] Database ready.");

  // Start background payment status sync (every 15 seconds)
  setInterval(syncPendingPayments, 15000);

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

  // List payments (for Merchant Dashboard) - simple DB query, no BlinkPay calls
  app.get(api.payments.list.path, async (req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  // Get single payment status - checks BlinkPay directly for fast confirmation page updates
  function normalizeBlinkPayStatus(s: any) {
    const status = String(s ?? "").toLowerCase();

    if (["completed", "success", "succeeded", "paid", "settled", "confirmed"].includes(status)) {
      return "completed";
    }
    if (["failed", "error", "declined", "rejected", "cancelled", "canceled"].includes(status)) {
      return "failed";
    }
    if (["pending", "processing", "in_progress", "authorised", "authorized"].includes(status)) {
      return "pending";
    }

    // safe fallback
    return "pending";
  }
  app.get(api.payments.get.path, async (req, res) => {
    const idParam = req.params.id;
    const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const payment = await storage.getPayment(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.blinkPayId && payment.status !== "completed" && isBlinkPayConfigured()) {
      try {
        const blinkStatus = await withTimeout(getQuickPaymentStatus(payment.blinkPayId), 5000);
        const normalized = normalizeBlinkPayStatus(blinkStatus.status);

        if (normalized !== payment.status) {
          const updated = await storage.updatePaymentStatus(id, normalized);
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
        console.log("Mock mode enabled, using mock gateway");
        redirectUri = `/api/mock-blinkpay-gateway?paymentId=${payment.id}`;
      } else if (isBlinkPayConfigured()) {
        try {
          console.log("Creating BlinkPay quick payment...");
          const blinkResponse = await createQuickPayment({
            amount: input.amount.toString(),
            reference: input.reference || `Payment-${payment.id}`,
            redirectUri: confirmationUrl,
            bank: input.bank,
          });

          await storage.updatePaymentStatus(payment.id, "pending", blinkResponse.quickPaymentId);
          redirectUri = blinkResponse.redirectUri;
          console.log("BlinkPay payment created:", blinkResponse.quickPaymentId);
        } catch (err: any) {
          console.error("BlinkPay API error:", err.message);
          await storage.updatePaymentStatus(payment.id, "failed");
          const isDev = process.env.NODE_ENV !== "production";
          const message = isDev && err?.message
            ? `Payment gateway error: ${err.message}`
            : "Payment gateway error. Please try again later.";
          return res.status(502).json({ message });
        }
      } else {
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
