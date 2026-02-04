
import { z } from "zod";
import { insertPaymentSchema, payments, bankSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  payments: {
    create: {
      method: "POST" as const,
      path: "/api/payments",
      input: insertPaymentSchema,
      responses: {
        201: z.object({
          paymentId: z.number(),
          redirectUri: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/payments/:id",
      responses: {
        200: z.custom<typeof payments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/payments",
      responses: {
        200: z.array(z.custom<typeof payments.$inferSelect>()),
      },
    },
  },
  banks: {
    list: {
      method: "GET" as const,
      path: "/api/banks",
      responses: {
        200: z.array(bankSchema),
        503: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CreatePaymentResponse = z.infer<typeof api.payments.create.responses[201]>;
