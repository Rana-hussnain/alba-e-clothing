/**
 * ALBA-E company contact details — single source of truth.
 * Used in footer, order confirmation, admin dashboard links, etc.
 */

/** Company support email */
export const COMPANY_EMAIL = "albaeclothing@gmail.com";

/** Company phone (local format) */
export const COMPANY_PHONE = "03055572714";

/** Company phone in international format for WhatsApp / tel links */
export const COMPANY_PHONE_INTL = "923055572714";

/** Alternate contact number (local + international format) */
export const COMPANY_PHONE_ALT = "03060343293";
export const COMPANY_PHONE_ALT_INTL = "923060343293";

/** JazzCash wallet number that receives ALBA-E order payments (full amount) */
export const JAZZCASH_ACCOUNT_ID =
  process.env.NEXT_PUBLIC_JAZZCASH_ACCOUNT_ID?.trim() || "03060343293";

/** Account title shown on JazzCash when the number is verified */
export const JAZZCASH_ACCOUNT_NAME = "Muhammad Hamza";

/** Group as "0306 0343293" for display */
export function formatMobileDisplay(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length === 11 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : phone;
}

export const JAZZCASH_ACCOUNT_DISPLAY = formatMobileDisplay(JAZZCASH_ACCOUNT_ID);
export const COMPANY_PHONE_DISPLAY = formatMobileDisplay(COMPANY_PHONE);
export const COMPANY_PHONE_ALT_DISPLAY = formatMobileDisplay(COMPANY_PHONE_ALT);
/** "+92 0305 5572714" style, as shown on the storefront */
export const COMPANY_PHONE_LABEL = `+92 ${COMPANY_PHONE_DISPLAY}`;
export const COMPANY_PHONE_ALT_LABEL = `+92 ${COMPANY_PHONE_ALT_DISPLAY}`;

/** Pre-built contact links */
export const WHATSAPP_LINK = `https://wa.me/${COMPANY_PHONE_INTL}`;
export const TEL_LINK = `tel:+${COMPANY_PHONE_INTL}`;
export const TEL_LINK_ALT = `tel:+${COMPANY_PHONE_ALT_INTL}`;
export const MAILTO_LINK = `mailto:${COMPANY_EMAIL}`;

/** Normalize a Pakistani local number (03xx…) to wa.me digits */
export function waLink(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  return `https://wa.me/${digits}`;
}

/**
 * WhatsApp link that opens a chat with the store with the product already mentioned,
 * so the customer can ask for details / talk to us in one tap.
 */
export function productWhatsAppLink(p: { name: string; price: number; size?: string; pageUrl?: string }): string {
  const lines = [
    "Hi ALBA-E! I'd like details about this product:",
    `• ${p.name}`,
    `• Price: PKR ${p.price.toLocaleString("en-US")}`,
    ...(p.size ? [`• Size: ${p.size}`] : []),
    ...(p.pageUrl ? [p.pageUrl] : []),
  ];
  return `https://wa.me/${COMPANY_PHONE_INTL}?text=${encodeURIComponent(lines.join("\n"))}`;
}
