
import { db } from "./db";
import { payments, type Payment, type InsertPayment } from "@shared/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";

export interface IStorage {
  getPayment(id: number): Promise<Payment | undefined>;
  getPayments(): Promise<Payment[]>;
  getPendingBlinkPayments(limit?: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment & { blinkPayId?: string; status?: string }): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, blinkPayId?: string): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPendingBlinkPayments(limit: number = 10): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, "pending"),
          isNotNull(payments.blinkPayId)
        )
      )
      .orderBy(desc(payments.createdAt))
      .limit(limit);
  }

  async createPayment(insertPayment: InsertPayment & { blinkPayId?: string; status?: string }): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(insertPayment)
      .returning();
    return payment;
  }

  async updatePaymentStatus(id: number, status: string, blinkPayId?: string): Promise<Payment> {
    const updateData: any = { status, updatedAt: new Date() };
    if (blinkPayId) {
      updateData.blinkPayId = blinkPayId;
    }

    const [updated] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
