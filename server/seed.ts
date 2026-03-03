
import { storage } from "./storage";

export async function seedDatabase() {
  const payments = await storage.getPayments();
  console.log("[server] Seed: found", payments.length, "existing payments.");
  if (payments.length === 0) {
    console.log("Seeding database with dummy payments...");
    await storage.createPayment({
      amount: "15.00",
      description: "Coffee and Muffin",
      reference: "ORDER-101",
      status: "completed",
    });
    await storage.createPayment({
      amount: "45.50",
      description: "Lunch for two",
      reference: "ORDER-102",
      status: "pending",
    });
    await storage.createPayment({
      amount: "120.00",
      description: "Dinner Party",
      reference: "ORDER-103",
      status: "failed",
    });
  }
}
