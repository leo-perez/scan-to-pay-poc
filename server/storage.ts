
import { db } from "./db";
import { payments, type Payment, type InsertPayment } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByBlinkPayId(blinkPayId: string): Promise<Payment | undefined>;
  getPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment & { blinkPayId?: string; status?: string }): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, blinkPayId?: string): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByBlinkPayId(blinkPayId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.blinkPayId, blinkPayId));
    return payment;
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
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
