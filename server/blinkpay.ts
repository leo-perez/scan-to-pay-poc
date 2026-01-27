import axios from "axios";

// BlinkPay API configuration
// Default to sandbox for testing, set BLINKPAY_SANDBOX=false for production
const BLINKPAY_BASE_URL = process.env.BLINKPAY_SANDBOX === "false" 
  ? "https://debit.blinkpay.co.nz" 
  : "https://sandbox.debit.blinkpay.co.nz";

interface QuickPaymentRequest {
  amount: string;
  reference?: string;
  redirectUri: string;
}

interface QuickPaymentResponse {
  quickPaymentId: string;
  redirectUri: string;
}

interface PaymentStatus {
  status: "pending" | "completed" | "failed";
  quickPaymentId: string;
}

// Get the API key from environment
function getApiKey(): string {
  const apiKey = process.env.BLINKPAY_API_KEY;
  
  if (!apiKey) {
    throw new Error("BLINKPAY_API_KEY not configured");
  }

  return apiKey;
}

export async function createQuickPayment(request: QuickPaymentRequest): Promise<QuickPaymentResponse> {
  const apiKey = getApiKey();

  const payload = {
    flow: {
      detail: {
        type: "gateway",
        redirect_uri: request.redirectUri,
      },
    },
    amount: {
      currency: "NZD",
      total: request.amount,
    },
    pcr: {
      particulars: "ScanToPay",
      code: "PAYMENT",
      reference: request.reference || "Payment",
    },
  };

  try {
    const response = await axios.post(
      `${BLINKPAY_BASE_URL}/payments/v1/quick-payments`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      quickPaymentId: response.data.quick_payment_id,
      redirectUri: response.data.redirect_uri,
    };
  } catch (error: any) {
    console.error("Failed to create BlinkPay payment:", error.response?.data || error.message);
    throw new Error("Failed to create payment with BlinkPay");
  }
}

export async function getQuickPaymentStatus(quickPaymentId: string): Promise<PaymentStatus> {
  const apiKey = getApiKey();

  try {
    const response = await axios.get(
      `${BLINKPAY_BASE_URL}/payments/v1/quick-payments/${quickPaymentId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const consent = response.data.consent;
    let status: "pending" | "completed" | "failed" = "pending";

    // Map BlinkPay consent status to our status
    if (consent?.status === "Authorised" || consent?.status === "Consumed") {
      status = "completed";
    } else if (consent?.status === "Rejected" || consent?.status === "Revoked") {
      status = "failed";
    }

    return {
      status,
      quickPaymentId,
    };
  } catch (error: any) {
    console.error("Failed to get BlinkPay payment status:", error.response?.data || error.message);
    return {
      status: "pending",
      quickPaymentId,
    };
  }
}

export function isBlinkPayConfigured(): boolean {
  return !!process.env.BLINKPAY_API_KEY;
}
