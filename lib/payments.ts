import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export type PaymentChannel = "promptpay" | "bank";

export const PAYMENT_CHANNEL_LABEL: Record<PaymentChannel, string> = {
  promptpay: "PromptPay",
  bank: "โอนเข้าบัญชีธนาคาร",
};

/** Minimal shop payment fields used to decide which channels are available. */
export type ShopPaymentInfo = {
  promptpayId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  defaultPaymentMethod?: PaymentChannel | null;
};

/** Which payment channels this shop has actually configured (non-empty). */
export function availablePaymentChannels(shop: ShopPaymentInfo): PaymentChannel[] {
  const out: PaymentChannel[] = [];
  if (shop.promptpayId && shop.promptpayId.trim()) out.push("promptpay");
  if (shop.bankAccountNumber && shop.bankAccountNumber.trim()) out.push("bank");
  return out;
}

/**
 * Resolve which channel money should be collected through.
 * - If only one channel is configured → that one (the `preferred` is ignored).
 * - If both are configured → the `preferred` if valid, else the shop default,
 *   else the first available.
 * - If none are configured → null.
 */
export function resolvePaymentChannel(
  shop: ShopPaymentInfo,
  preferred?: PaymentChannel | null,
): PaymentChannel | null {
  const available = availablePaymentChannels(shop);
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];
  if (preferred && available.includes(preferred)) return preferred;
  if (shop.defaultPaymentMethod && available.includes(shop.defaultPaymentMethod))
    return shop.defaultPaymentMethod;
  return available[0];
}

/**
 * Build a PromptPay QR as a PNG data URL for the given PromptPay id
 * (mobile number / national id / e-wallet id) and amount in baht.
 * Generated server-side; pass the string to a client <img src>.
 * Returns null if the shop has no PromptPay id configured.
 */
export async function promptPayQrDataUrl(
  promptpayId: string | null | undefined,
  amount: number
): Promise<string | null> {
  if (!promptpayId || amount <= 0) return null;
  try {
    const payload = generatePayload(promptpayId.trim(), { amount });
    return await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  } catch (e) {
    console.error("[doprent] promptPayQrDataUrl error", e);
    return null;
  }
}
