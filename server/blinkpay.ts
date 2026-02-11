import axios from "axios";
import { 
  BlinkDebitClient, 
  GatewayFlow, 
  RedirectFlow,
  AuthFlowDetailTypeEnum,
  AmountCurrencyEnum,
  QuickPaymentRequest as BlinkQuickPaymentRequest,
  Bank,
  BankMetadata
} from "blink-debit-api-client-node";

interface QuickPaymentRequest {
  amount: string;
  reference?: string;
  redirectUri: string;
  bank?: string;
}

export interface BankInfo {
  id: string;
  name: string;
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

  // Format amount to always have 2 decimal places (BlinkPay requires this)
  const formattedAmount = parseFloat(request.amount).toFixed(2);

  let flowDetail: GatewayFlow | RedirectFlow;

  if (request.bank) {
    // Use RedirectFlow when bank is specified - bypasses bank selection screen
    const redirectFlow = new RedirectFlow();
    redirectFlow.type = AuthFlowDetailTypeEnum.Redirect;
    redirectFlow.redirectUri = request.redirectUri;
    redirectFlow.bank = request.bank as Bank;
    flowDetail = redirectFlow;
  } else {
    // Use GatewayFlow for BlinkPay's hosted bank selection
    const gatewayFlow = new GatewayFlow();
    gatewayFlow.type = AuthFlowDetailTypeEnum.Gateway;
    gatewayFlow.redirectUri = request.redirectUri;
    flowDetail = gatewayFlow;
  }

  const paymentRequest: BlinkQuickPaymentRequest = {
    flow: {
      detail: flowDetail,
    },
    amount: {
      currency: AmountCurrencyEnum.NZD,
      total: formattedAmount,
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

async function getAccessToken(): Promise<string> {
  const clientId = process.env.BLINKPAY_CLIENT_ID;
  const clientSecret = process.env.BLINKPAY_CLIENT_SECRET;
  const isSandbox = process.env.BLINKPAY_SANDBOX !== "false";
  const tokenUrl = isSandbox
    ? "https://sandbox.debit.blinkpay.co.nz/oauth2/token"
    : "https://debit.blinkpay.co.nz/oauth2/token";

  const response = await axios.post(tokenUrl, 
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: clientId!, password: clientSecret! },
    }
  );
  return response.data.access_token;
}

async function getStatusViaDirectApi(quickPaymentId: string): Promise<PaymentStatus> {
  const isSandbox = process.env.BLINKPAY_SANDBOX !== "false";
  const baseUrl = isSandbox
    ? "https://sandbox.debit.blinkpay.co.nz"
    : "https://debit.blinkpay.co.nz";

  const token = await getAccessToken();
  const response = await axios.get(`${baseUrl}/payments/v1/quick-payments/${quickPaymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const consentStatus = response.data?.consent?.status;
  console.log(`[Direct API] BlinkPay consent status for ${quickPaymentId}: "${consentStatus}"`);

  return {
    status: mapBlinkPayStatus(consentStatus || ""),
    quickPaymentId,
  };
}

export async function getQuickPaymentStatus(quickPaymentId: string): Promise<PaymentStatus> {
  try {
    const client = getBlinkClient();
    const response = await client.getQuickPayment(quickPaymentId);
    
    let status: "pending" | "completed" | "failed" = "pending";

    const consentStatus = response.consent?.status;
    console.log(`BlinkPay consent status for ${quickPaymentId}: "${consentStatus}"`);
    
    if (consentStatus === "Authorised" || consentStatus === "Consumed") {
      status = "completed";
    } else if (consentStatus === "Rejected" || consentStatus === "Revoked" || consentStatus === "GatewayTimeout") {
      status = "failed";
    }

    return {
      status,
      quickPaymentId,
    };
  } catch (error: any) {
    console.error("SDK status check failed, trying direct API:", error.message);
    try {
      return await getStatusViaDirectApi(quickPaymentId);
    } catch (fallbackError: any) {
      console.error("Direct API status check also failed:", fallbackError.response?.data || fallbackError.message);
      return {
        status: "pending",
        quickPaymentId,
      };
    }
  }
}

export function mapBlinkPayStatus(consentStatus: string): "pending" | "completed" | "failed" {
  switch (consentStatus) {
    case "Authorised":
    case "Consumed":
      return "completed";
    case "Rejected":
    case "Revoked":
    case "GatewayTimeout":
      return "failed";
    default:
      return "pending";
  }
}

export function isBlinkPayConfigured(): boolean {
  return !!(process.env.BLINKPAY_CLIENT_ID && process.env.BLINKPAY_CLIENT_SECRET);
}

export async function getAvailableBanks(): Promise<BankInfo[]> {
  const client = getBlinkClient();

  try {
    const metadata: BankMetadata[] = await client.getMeta();
    
    return metadata.map((bank) => ({
      id: bank.name as string,
      name: formatBankName(bank.name as string),
    }));
  } catch (error: any) {
    console.error("Failed to get BlinkPay bank metadata:", error.response?.data || error.message);
    throw new Error("Failed to retrieve available banks");
  }
}

function formatBankName(bankId: string): string {
  const bankNames: Record<string, string> = {
    "ANZ": "ANZ Bank",
    "ASB": "ASB Bank",
    "BNZ": "Bank of New Zealand",
    "Westpac": "Westpac NZ",
    "PNZ": "The Co-operative Bank",
    "Kiwibank": "Kiwibank",
  };
  return bankNames[bankId] || bankId;
}
