import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

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
