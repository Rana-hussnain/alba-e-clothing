import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  COMPANY_EMAIL,
  COMPANY_PHONE,
  COMPANY_PHONE_LABEL,
  JAZZCASH_ACCOUNT_NAME,
  JAZZCASH_ACCOUNT_DISPLAY,
} from "@/lib/contact";
import { formatPKR, parseJsonArray, type Order } from "@/lib/shop";

/**
 * Order confirmation emails.
 *
 *  - Two emails fire on every order: a receipt to the customer (when an email
 *    was provided) and a full notification to the store owner.
 *  - If SMTP credentials are configured (SMTP_HOST/USER/PASS) emails are sent
 *    for real; otherwise they are recorded as QUEUED in the dashboard so the
 *    owner can still see exactly what went out.
 *  - Email failures NEVER break the order — everything is caught and logged.
 */

type OrderLike = Omit<Order, "createdAt" | "paidAt"> & {
  createdAt: string | Date;
  paidAt?: Date | string | null;
};

export function isMailLive(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function mailMode(): "live" | "queued" {
  return isMailLive() ? "live" : "queued";
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port: Number(process.env.SMTP_PORT?.trim() || 587),
    secure: Number(process.env.SMTP_PORT?.trim() || 587) === 465,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
    // Never let a slow mail server hang checkout
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* ---------------- shared HTML shell ---------------- */

/** Store logo embedded inline (referenced as cid:albae-logo) — no site URL needed. */
const LOGO_PATH = path.join(process.cwd(), "public", "logo-mark.png");

function logoAttachment(): Array<{ filename: string; path: string; cid: string }> {
  return fs.existsSync(LOGO_PATH)
    ? [{ filename: "logo-mark.png", path: LOGO_PATH, cid: "albae-logo" }]
    : [];
}

function shell(title: string, inner: string): string {
  const logo = `<img src="cid:albae-logo" alt="ALBA-E" width="56" height="56" style="display:block;border-radius:4px;" />`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f3f1;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f1;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4e2de;">
    <tr><td style="background:#111111;padding:22px 28px;">
      <table role="presentation" width="100%"><tr>
        <td>${logo}</td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:3px;">ALBA-E</div>
          <div style="color:#9c9c9c;font-size:9px;letter-spacing:2.5px;margin-top:3px;">STYLE TAKES FLIGHT</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 18px;font-size:17px;letter-spacing:1.5px;text-transform:uppercase;color:#111;">${esc(title)}</h1>
      ${inner}
    </td></tr>
    <tr><td style="background:#faf9f7;border-top:1px solid #e4e2de;padding:18px 28px;">
      <p style="margin:0;font-size:11px;line-height:1.7;color:#777;">
        Need help? Call or WhatsApp <a href="tel:+92${COMPANY_PHONE.slice(1)}" style="color:#111;text-decoration:none;font-weight:bold;">${COMPANY_PHONE_LABEL}</a>
        &nbsp;·&nbsp; <a href="mailto:${COMPANY_EMAIL}" style="color:#111;text-decoration:none;font-weight:bold;">${COMPANY_EMAIL}</a><br/>
        ALBA-E Clothing — Full payment via JazzCash · Shipping PKR 300 · 3-day returns
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function itemsTable(order: OrderLike): string {
  const items = parseJsonArray(order.itemsJson) as unknown as Array<{
    name: string;
    size: string;
    qty: number;
    lineTotal: number;
  }>;
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;">${esc(i.name)}<br/>
          <span style="color:#999;font-size:11px;">Size ${esc(i.size)} &times; ${i.qty}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;white-space:nowrap;">${formatPKR(i.lineTotal)}</td>
      </tr>`
    )
    .join("");
  const paid = order.paymentStatus === "PAID";
  const verifying = order.paymentStatus === "VERIFYING";
  const statusLabel = paid
    ? "PAID"
    : verifying
      ? "SUBMITTED — VERIFYING"
      : "AWAITING PAYMENT";
  const statusColor = paid ? "#0a7d33" : verifying ? "#b45309" : "#b45309";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;font-size:13px;">
    <tr><td style="padding:4px 0;color:#777;">Product Price</td><td style="padding:4px 0;text-align:right;">${formatPKR(order.subtotal)}</td></tr>
    <tr><td style="padding:4px 0;color:#777;">Shipping Charges</td><td style="padding:4px 0;text-align:right;">${formatPKR(order.shippingCharges)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #111;">Total (paid in full)</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:1px solid #111;">${formatPKR(order.totalPayable)}</td></tr>
    <tr><td style="padding:4px 0;color:#777;">Payment Status</td><td style="padding:4px 0;text-align:right;font-weight:bold;color:${statusColor};">${statusLabel}</td></tr>
  </table>`;
}

function detailTable(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 0;color:#777;vertical-align:top;white-space:nowrap;padding-right:16px;">${k}</td><td style="padding:5px 0;">${v}</td></tr>`
      )
      .join("")}
  </table>`;
}

/* ---------------- email builders ---------------- */

function buildCustomerEmail(order: OrderLike): { to: string; subject: string; html: string } | null {
  if (!order.email) return null;
  const paid = order.paymentStatus === "PAID";
  const verifying = order.paymentStatus === "VERIFYING";

  let payLine: string;
  if (paid) {
    payLine = `Your full payment of ${formatPKR(order.totalPayable)} has been received via JazzCash${
      order.txnRef ? ` (Ref ${esc(order.txnRef)})` : ""
    } — your order is confirmed and will be dispatched shortly.`;
  } else if (verifying) {
    payLine = `We have received your payment submission (TID ${esc(
      order.txnRef ?? "—"
    )}) and are verifying it with JazzCash. Your order will be confirmed the moment the payment is verified.`;
  } else {
    payLine = `To complete your order, send the full amount of ${formatPKR(
      order.totalPayable
    )} to JazzCash ${JAZZCASH_ACCOUNT_DISPLAY} (${JAZZCASH_ACCOUNT_NAME}), then submit your TID on the order page. We dispatch only after the payment is verified.`;
  }

  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Dear ${esc(order.firstName)},</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;">
      Thank you for shopping at <strong>ALBA-E</strong>! Your order has been received.
    </p>
    <div style="background:#faf9f7;border:1px solid #e4e2de;padding:14px 18px;margin-bottom:20px;">
      ${detailTable([
        ["Order Number", `<strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong>`],
        ["Order Date", fmtDate(order.createdAt)],
        ["Payment", `JazzCash — ${paid ? "PAID in full" : verifying ? "submitted, verifying" : "awaiting payment"}`],
      ])}
    </div>
    <h2 style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your Items</h2>
    ${itemsTable(order)}
    <h2 style="margin:24px 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Delivery Address</h2>
    <p style="margin:0;font-size:13px;line-height:1.8;">
      ${esc(order.firstName)} ${esc(order.lastName)}<br/>
      ${esc(order.address)}<br/>
      ${esc(order.city)} — ${esc(order.postalCode)}<br/>
      ${esc(order.contactNumber)}
    </p>
    <div style="border-left:3px solid #111;padding:10px 16px;margin:22px 0;background:#faf9f7;">
      <p style="margin:0;font-size:13px;line-height:1.7;">${payLine}</p>
    </div>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;">
      We will contact you at <strong>${esc(order.contactNumber)}</strong> once your order is confirmed for delivery.
      Items can be returned within <strong>3 days</strong> of delivery (unworn, tags attached).
    </p>`;
  return {
    to: order.email,
    subject: `ALBA-E — Order ${order.orderNumber} received ✓`,
    html: shell("Order Confirmation", inner),
  };
}

function buildOwnerEmail(order: OrderLike): { to: string; subject: string; html: string } {
  const items = parseJsonArray(order.itemsJson) as unknown as Array<{
    name: string;
    size: string;
    qty: number;
  }>;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const dashboard = siteUrl
    ? `<a href="${siteUrl}/admin" style="color:#111;font-weight:bold;">Open Owner Dashboard →</a>`
    : `Open <strong>/admin</strong> on the store to manage this order.`;
  const paid = order.paymentStatus === "PAID";
  const verifying = order.paymentStatus === "VERIFYING";
  const paymentLine = paid
    ? `JazzCash · <span style="color:#0a7d33;font-weight:bold;">PAID IN FULL</span>${order.paidAt ? ` on ${fmtDate(order.paidAt)}` : ""}`
    : verifying
      ? `JazzCash · <span style="color:#b45309;font-weight:bold;">VERIFYING</span> — customer submitted TID <code>${esc(order.txnRef ?? "")}</code> from ${esc(order.senderNumber ?? "")}`
      : `JazzCash · <span style="color:#b45309;font-weight:bold;">AWAITING PAYMENT</span> — dispatch only after full payment is verified`;

  const inner = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">
      <strong>New order received.</strong> Details below — the order is already visible on the Owner Dashboard.
    </p>
    <div style="background:#faf9f7;border:1px solid #e4e2de;padding:14px 18px;margin-bottom:20px;">
      ${detailTable([
        ["Order", `<strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong>`],
        ["Placed", fmtDate(order.createdAt)],
        ["Customer", `${esc(order.firstName)} ${esc(order.lastName)}`],
        ["Phone", `<a href="tel:${esc(order.contactNumber)}" style="color:#111;">${esc(order.contactNumber)}</a> · <a href="https://wa.me/92${esc(order.contactNumber).replace(/[^0-9]/g, "").slice(1)}" style="color:#0a7d33;">WhatsApp</a>`],
        ["Email", order.email ? `<a href="mailto:${esc(order.email)}" style="color:#111;">${esc(order.email)}</a>` : "<em>not provided</em>"],
        ["Address", `${esc(order.address)}, ${esc(order.city)} — ${esc(order.postalCode)}`],
        ["Payment", paymentLine],
      ])}
    </div>
    <h2 style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Items (${totalQty})</h2>
    ${itemsTable(order)}
    <div style="border-left:3px solid #111;padding:10px 16px;margin:22px 0;background:#faf9f7;">
      <p style="margin:0;font-size:13px;line-height:1.7;">
        ${
          paid
            ? "Payment received in full — order confirmed for dispatch."
            : verifying
              ? `Cross-check TID <strong>${esc(order.txnRef ?? "")}</strong> (${esc(order.senderNumber ?? "")}) in your JazzCash app, then verify it on the dashboard to confirm the order.`
              : `Customer must send ${formatPKR(order.totalPayable)} to JazzCash ${JAZZCASH_ACCOUNT_DISPLAY}. Verify the payment on the dashboard before dispatching.`
        }
      </p>
    </div>
    <p style="margin:0;font-size:13px;">${dashboard}</p>`;
  return {
    to: process.env.OWNER_EMAIL?.trim() || COMPANY_EMAIL,
    subject: `🛍 New order ${order.orderNumber} — ${order.firstName} ${order.lastName} — ${formatPKR(order.totalPayable)}${
      order.paymentStatus === "VERIFYING" ? " — verify JazzCash TID" : ""
    }`,
    html: shell("New Order Notification", inner),
  };
}

/* ---------------- delivery + logging ---------------- */

type MailKind =
  | "ORDER_SHIPPED"
  | "CUSTOMER_CONFIRMATION"
  | "OWNER_NOTIFICATION"
  | "PAYMENT_CONFIRMATION"
  | "OWNER_PAYMENT_ALERT"
  | "PAYMENT_REJECTED";

async function logEmail(entry: {
  orderNumber: string;
  kind: MailKind;
  to: string;
  subject: string;
  html: string;
  status: "SENT" | "QUEUED" | "FAILED" | "SKIPPED";
  error?: string;
}) {
  try {
    await db.emailLog.create({
      data: {
        orderNumber: entry.orderNumber,
        kind: entry.kind,
        to: entry.to,
        subject: entry.subject,
        bodyHtml: entry.html,
        status: entry.status,
        error: entry.error ?? null,
      },
    });
  } catch (e) {
    console.error("email log write failed:", e);
  }
}

async function deliver(
  msg: { to: string; subject: string; html: string },
  meta: {
    orderNumber: string;
    kind: MailKind;
  }
) {
  if (!isMailLive()) {
    console.log(`[mail:queued] ${meta.kind} → ${msg.to} (${msg.subject})`);
    await logEmail({ ...meta, ...msg, status: "QUEUED" });
    return;
  }
  try {
    await transporter().sendMail({
      from: process.env.MAIL_FROM?.trim() || `ALBA-E <${process.env.SMTP_USER!.trim()}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      attachments: logoAttachment(),
    });
    await logEmail({ ...meta, ...msg, status: "SENT" });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[mail:failed] ${meta.kind} → ${msg.to}:`, error);
    await logEmail({ ...meta, ...msg, status: "FAILED", error });
  }
}

/**
 * Send (or queue) the customer receipt + owner notification for a new order.
 * Safe to call for orders without a customer email — owner alert still fires.
 */
export async function sendOrderEmails(order: OrderLike): Promise<void> {
  const customer = buildCustomerEmail(order);
  if (customer) {
    await deliver(customer, { orderNumber: order.orderNumber, kind: "CUSTOMER_CONFIRMATION" });
  } else {
    await logEmail({
      orderNumber: order.orderNumber,
      kind: "CUSTOMER_CONFIRMATION",
      to: "(not provided)",
      subject: `ALBA-E — Order ${order.orderNumber} received`,
      html: "",
      status: "SKIPPED",
    });
  }
  await deliver(buildOwnerEmail(order), {
    orderNumber: order.orderNumber,
    kind: "OWNER_NOTIFICATION",
  });
}

/**
 * Payment verified — email the customer that the full payment is confirmed and
 * the order is being prepared for dispatch. Fired from the owner dashboard.
 */
export async function sendPaymentVerifiedEmail(order: OrderLike): Promise<void> {
  if (!order.email) {
    await logEmail({
      orderNumber: order.orderNumber,
      kind: "PAYMENT_CONFIRMATION",
      to: "(not provided)",
      subject: `ALBA-E — Payment verified for ${order.orderNumber}`,
      html: "",
      status: "SKIPPED",
    });
    return;
  }

  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Dear ${esc(order.firstName)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
      Good news! Your full payment of <strong>${formatPKR(order.totalPayable)}</strong> for order
      <strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong> has been
      <span style="color:#0a7d33;font-weight:bold;">verified and received</span>${
        order.txnRef ? ` (Ref ${esc(order.txnRef)})` : ""
      }.
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;">
      Your order is now <strong>confirmed</strong> and will be prepared for dispatch.
      We will contact you at <strong>${esc(order.contactNumber)}</strong> with delivery updates.
    </p>
    <div style="border-left:3px solid #0a7d33;padding:10px 16px;margin:22px 0;background:#f2faf4;">
      <p style="margin:0;font-size:13px;line-height:1.7;">
        Delivery takes 2–5 working days nationwide. Items can be returned within
        <strong>3 days</strong> of delivery (unworn, tags attached).
      </p>
    </div>
    <p style="margin:0;font-size:13px;">Thank you for shopping at ALBA-E!</p>`;

  await deliver(
    {
      to: order.email,
      subject: `ALBA-E — Payment verified, order ${order.orderNumber} confirmed ✓`,
      html: shell("Payment Verified — Order Confirmed", inner),
    },
    { orderNumber: order.orderNumber, kind: "PAYMENT_CONFIRMATION" }
  );
}

/**
 * Alert the owner about a payment event on an order:
 *  - "SUBMITTED": customer submitted a JazzCash TID that needs manual verification
 *  - "PAID":      the JazzCash gateway confirmed the payment automatically
 */
export async function sendOwnerPaymentAlert(
  order: OrderLike,
  event: "SUBMITTED" | "PAID"
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const dashboard = siteUrl
    ? `<a href="${siteUrl}/admin" style="color:#111;font-weight:bold;">Open Owner Dashboard →</a>`
    : `Open <strong>/admin</strong> on the store to manage this order.`;
  const submitted = event === "SUBMITTED";
  const inner = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;">
      ${
        submitted
          ? `<strong>Payment submitted — please verify.</strong> The customer says they have paid ${formatPKR(order.totalPayable)} via JazzCash.`
          : `<strong>Payment received.</strong> JazzCash confirmed the full payment of ${formatPKR(order.totalPayable)}.`
      }
    </p>
    <div style="background:#faf9f7;border:1px solid #e4e2de;padding:14px 18px;margin-bottom:20px;">
      ${detailTable([
        ["Order", `<strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong>`],
        ["Customer", `${esc(order.firstName)} ${esc(order.lastName)} · ${esc(order.contactNumber)}`],
        ["Amount", formatPKR(order.totalPayable)],
        ["Transaction ID", `<code>${esc(order.txnRef ?? "—")}</code>`],
        ...(submitted ? ([["Paid from", esc(order.senderNumber ?? "—")]] as Array<[string, string]>) : []),
      ])}
    </div>
    <p style="margin:0;font-size:13px;line-height:1.7;">
      ${submitted ? "Cross-check the TID in your JazzCash app, then verify it on the dashboard. " : "The order is confirmed and ready to dispatch. "}${dashboard}
    </p>`;
  await deliver(
    {
      to: process.env.OWNER_EMAIL?.trim() || COMPANY_EMAIL,
      subject: submitted
        ? `💳 Verify payment — order ${order.orderNumber} — ${formatPKR(order.totalPayable)}`
        : `✅ Paid — order ${order.orderNumber} — ${formatPKR(order.totalPayable)}`,
      html: shell(submitted ? "Payment Needs Verification" : "Payment Received", inner),
    },
    { orderNumber: order.orderNumber, kind: "OWNER_PAYMENT_ALERT" }
  );
}

/* ---------------- account emails (never logged with their links) ---------------- */

/**
 * Sends an account email (verification / password reset). The links contain one-time tokens, so the
 * body is intentionally NOT stored in EmailLog. Without SMTP the link is printed to the server console (dev only).
 */
export async function sendAccountEmail(opts: {
  to: string;
  subject: string;
  title: string;
  innerHtml: string;
  plainLink?: string;
}): Promise<boolean> {
  if (!isMailLive()) {
    console.log(`[mail:queued] ${opts.subject} → ${opts.to}${opts.plainLink ? `\n   link: ${opts.plainLink}` : ""}`);
    return false;
  }
  try {
    await transporter().sendMail({
      from: process.env.MAIL_FROM?.trim() || `ALBA-E <${process.env.SMTP_USER!.trim()}>`,
      to: opts.to,
      subject: opts.subject,
      html: shell(opts.title, opts.innerHtml),
      attachments: logoAttachment(),
    });
    return true;
  } catch (e) {
    console.error(`[mail:failed] account email → ${opts.to}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${esc(href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:14px 26px;">${esc(label)}</a></p>
   <p style="margin:0;font-size:11px;color:#777;line-height:1.7;">Button not working? Copy this link into your browser:<br/><span style="word-break:break-all;">${esc(href)}</span></p>`;

export function sendVerificationEmail(to: string, name: string, link: string) {
  return sendAccountEmail({
    to,
    subject: "ALBA-E — Verify your email",
    title: "Verify Your Email",
    plainLink: link,
    innerHtml: `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;">Hi ${esc(name)},</p>
      <p style="margin:0;font-size:14px;line-height:1.7;">Welcome to <strong>ALBA-E</strong>! Please confirm your email address to activate ordering on your account. This link works for 24 hours.</p>
      ${button(link, "Verify my email")}
      <p style="margin:18px 0 0;font-size:12px;color:#777;line-height:1.7;">If you did not create this account you can safely ignore this email.</p>`,
  });
}

export function sendPasswordResetEmail(to: string, name: string, link: string) {
  return sendAccountEmail({
    to,
    subject: "ALBA-E — Reset your password",
    title: "Reset Your Password",
    plainLink: link,
    innerHtml: `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;">Hi ${esc(name)},</p>
      <p style="margin:0;font-size:14px;line-height:1.7;">We received a request to reset your ALBA-E password. This link works for <strong>1 hour</strong> and can be used once.</p>
      ${button(link, "Choose a new password")}
      <p style="margin:18px 0 0;font-size:12px;color:#777;line-height:1.7;">If you did not ask for this, ignore this email — your password stays the same.</p>`,
  });
}

/** Someone tried to register with an email that already has an account (sent to the real owner of that email). */
export function sendExistingAccountNotice(to: string, name: string) {
  return sendAccountEmail({
    to,
    subject: "ALBA-E — You already have an account",
    title: "You Already Have an Account",
    innerHtml: `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;">Hi ${esc(name)},</p>
      <p style="margin:0;font-size:14px;line-height:1.7;">Someone just tried to create an ALBA-E account with this email address, but you already have one. If it was you, simply sign in — or use <strong>Forgot password</strong> if you can't remember it. If it wasn't you, no action is needed.</p>`,
  });
}

/** The owner could not find the customer's JazzCash TID — ask them to re-check and resubmit. */
export async function sendPaymentRejectedEmail(order: OrderLike): Promise<void> {
  if (!order.email) return;
  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Dear ${esc(order.firstName)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
      We could not verify the JazzCash payment for order <strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong>
      (TID <code>${esc(order.txnRef ?? "—")}</code>).
    </p>
    <div style="border-left:3px solid #b91c1c;padding:10px 16px;margin:22px 0;background:#fdf3f3;">
      <p style="margin:0;font-size:13px;line-height:1.7;">
        Please check that you sent <strong>${formatPKR(order.totalPayable)}</strong> to JazzCash <strong>${JAZZCASH_ACCOUNT_DISPLAY}</strong>,
        then sign in, open <strong>My Orders</strong> and enter the correct Transaction ID. Or WhatsApp us on ${COMPANY_PHONE_LABEL} and we will help.
      </p>
    </div>`;
  await deliver(
    {
      to: order.email,
      subject: `ALBA-E — Please re-check your payment for order ${order.orderNumber}`,
      html: shell("Payment Could Not Be Verified", inner),
    },
    { orderNumber: order.orderNumber, kind: "PAYMENT_REJECTED" }
  );
}


/** Tell the customer their parcel is on its way (with the courier tracking number if the owner entered one). */
export async function sendOrderShippedEmail(order: OrderLike): Promise<void> {
  if (!order.email) return;

  const tracking = order.trackingNumber
    ? `<div style="border-left:3px solid #1d4ed8;padding:10px 16px;margin:22px 0;background:#f3f6ff;">
         <p style="margin:0;font-size:13px;line-height:1.7;">
           Courier: <strong>${esc(order.courier || "—")}</strong><br/>
           Tracking number: <strong style="letter-spacing:1px;">${esc(order.trackingNumber)}</strong>
         </p>
       </div>`
    : "";

  const inner = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Dear ${esc(order.firstName)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
      Your order <strong style="letter-spacing:1px;">${esc(order.orderNumber)}</strong> has been
      <strong>shipped</strong> and is on its way to ${esc(order.city)}.
    </p>
    ${tracking}
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
      The courier will call <strong>${esc(order.contactNumber)}</strong> before delivery — please keep your phone reachable.
      Delivery usually takes 2–5 working days.
    </p>
    <p style="margin:0;font-size:13px;">Thank you for shopping at ALBA-E!</p>`;

  await deliver(
    {
      to: order.email,
      subject: `ALBA-E — Your order ${order.orderNumber} has shipped 🚚`,
      html: shell("Your Order Has Shipped", inner),
    },
    { orderNumber: order.orderNumber, kind: "ORDER_SHIPPED" }
  );
}
