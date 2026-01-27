import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertPayment } from "@shared/routes";
import { z } from "zod";

// Helper to parse dates from JSON since they come as strings
function parsePayment(payment: any) {
  return {
    ...payment,
    createdAt: payment.createdAt ? new Date(payment.createdAt) : null,
    updatedAt: payment.updatedAt ? new Date(payment.updatedAt) : null,
  };
}

export function usePayments() {
  return useQuery({
    queryKey: [api.payments.list.path],
    queryFn: async () => {
      const res = await fetch(api.payments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      const parsed = api.payments.list.responses[200].parse(data);
      return parsed.map(parsePayment);
    },
    refetchInterval: 5000, // Poll every 5s for live dashboard updates
  });
}

export function usePayment(id: number) {
  return useQuery({
    queryKey: [api.payments.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.payments.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Payment not found");
      if (!res.ok) throw new Error("Failed to fetch payment");
      
      const data = await res.json();
      const parsed = api.payments.get.responses[200].parse(data);
      return parsePayment(parsed);
    },
    refetchInterval: (query) => {
      // Poll until completed or failed
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (data: InsertPayment) => {
      // Ensure amount is string for numeric type
      const payload = {
        ...data,
        amount: String(data.amount), 
      };
      
      const validated = api.payments.create.input.parse(payload);
      const res = await fetch(api.payments.create.path, {
        method: api.payments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.payments.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create payment");
      }
      return api.payments.create.responses[201].parse(await res.json());
    },
  });
}
