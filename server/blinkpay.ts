import axios from "axios";
import { 
  BlinkDebitClient, 
  GatewayFlow, 
  AuthFlowDetailTypeEnum,
  AmountCurrencyEnum,
  QuickPaymentRequest as BlinkQuickPaymentRequest
} from "blink-debit-api-client-node";

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

let blinkClient: BlinkDebitClient | null = null;

function getBlinkClient(): BlinkDebitClient {
  if (!blinkClient) {
    const clientId = process.env.BLINKPAY_CLIENT_ID;
    const clientSecret = process.env.BLINKPAY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("BLINKPAY_CLIENT_ID and BLINKPAY_CLIENT_SECRET must be configured");
    }

    const isSandbox = process.env.BLINKPAY_SANDBOX !== "false";
    const debitUrl = isSandbox 
      ? "https://sandbox.debit.blinkpay.co.nz"
      : "https://debit.blinkpay.co.nz";

    const axiosInstance = axios.create();
    blinkClient = new BlinkDebitClient(axiosInstance, debitUrl, clientId, clientSecret);

    console.log(`BlinkPay client initialized (${isSandbox ? 'sandbox' : 'production'} mode)`);
  }

  return blinkClient;
}

export async function createQuickPayment(request: QuickPaymentRequest): Promise<QuickPaymentResponse> {
  const client = getBlinkClient();

  const gatewayFlow = new GatewayFlow();
  gatewayFlow.type = AuthFlowDetailTypeEnum.Gateway;
  gatewayFlow.redirectUri = request.redirectUri;

  const paymentRequest: BlinkQuickPaymentRequest = {
    flow: {
      detail: gatewayFlow,
    },
    amount: {
      currency: AmountCurrencyEnum.NZD,
      total: request.amount,
    },
    pcr: {
      particulars: "ScanToPay",
      code: "PAYMENT",
      reference: (request.reference || "Payment").substring(0, 12),
    },
  };

  try {
    console.log("Creating BlinkPay quick payment with request:", JSON.stringify(paymentRequest, null, 2));
    const response = await client.createQuickPayment(paymentRequest);
    
    console.log("BlinkPay response:", JSON.stringify(response, null, 2));

    if (!response.quickPaymentId || !response.redirectUri) {
      throw new Error("Invalid response from BlinkPay - missing quickPaymentId or redirectUri");
    }

    return {
      quickPaymentId: response.quickPaymentId,
      redirectUri: response.redirectUri,
    };
  } catch (error: any) {
    console.error("Failed to create BlinkPay payment:", error.response?.data || error.message || error);
    throw new Error(`Failed to create payment with BlinkPay: ${error.message}`);
  }
}

export async function getQuickPaymentStatus(quickPaymentId: string): Promise<PaymentStatus> {
  const client = getBlinkClient();

  try {
    const response = await client.getQuickPayment(quickPaymentId);
    
    let status: "pending" | "completed" | "failed" = "pending";

    const consentStatus = response.consent?.status;
    if (consentStatus === "Authorised" || consentStatus === "Consumed") {
      status = "completed";
    } else if (consentStatus === "Rejected" || consentStatus === "Revoked") {
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
  return !!(process.env.BLINKPAY_CLIENT_ID && process.env.BLINKPAY_CLIENT_SECRET);
}
