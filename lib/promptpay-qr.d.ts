declare module "promptpay-qr" {
  /** Generate an EMVCo PromptPay payload string. */
  export default function generatePayload(
    id: string,
    options?: { amount?: number }
  ): string;
}
