
import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  amount: numeric("amount").notNull(), // using numeric for currency to avoid float issues, represents dollars
  currency: text("currency").notNull().default("NZD"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  description: text("description"),
  reference: text("reference"), // PCR reference
  blinkPayId: text("blink_pay_id"), // ID from BlinkPay
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  amount: true,
  description: true,
  reference: true,
}).extend({
  bank: z.string().optional(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export const bankSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type BankInfo = z.infer<typeof bankSchema>;
