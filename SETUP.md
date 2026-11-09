# ALBA-E — setup

Open a terminal **inside the project folder** (the one that contains `package.json`), then:

```
npm install
npm run dev
```

That is all. `npm run dev` automatically creates the database tables in MongoDB Atlas and loads the 23 default
products the first time (it never re-adds products you deleted or edits you made). Open http://localhost:3000
(owner dashboard: /admin).

If it says it cannot reach the database: Atlas -> Network Access -> allow `0.0.0.0/0`, check internet and `DATABASE_URL` in `.env`.
Skip the automatic DB setup with `SKIP_DB_SETUP=1 npm run dev`.

## Database (MongoDB Atlas)
1. Atlas -> Network Access -> add IP `0.0.0.0/0` (needed for Vercel/hosting, whose IPs change).
2. Put your connection string in `.env` as `DATABASE_URL` (see `.env.example`, database name `albae`).
3. `npx prisma generate` then `npx prisma db push` (creates collections + unique indexes)
4. `npm run db:seed` (needs bun; or `npx tsx scripts/seed.ts`) -> loads the 23 products. Safe to re-run.
Tip: store the same DATABASE_URL in Vercel -> Settings -> Environment Variables. Never commit `.env`.

## Emails (customer + owner)
Set SMTP_* in `.env`. Gmail: turn on 2-Step Verification → Google Account → Security → App passwords →
paste the 16-char password as `SMTP_PASS`. Without SMTP_PASS, emails are only logged (status QUEUED).
Sent: order received (customer + owner), payment submitted (owner), payment verified/received (customer).
Email comes from the customer account (always present).

## Customer accounts & ordering
- Customers must register (name, email, mobile, password) and sign in before they can order. Passwords are
  stored only as scrypt hashes (min 10 chars, letters + numbers, common passwords refused).
- Sessions: signed httpOnly SameSite=Strict cookie (`albae_customer`, 7 days); changing/resetting a password signs out old sessions.
- Lockout: 5 wrong tries from one IP / 10 for one account -> locked 15 min (doubling, max 24 h). Errors are generic (no account enumeration).
- Email verification: a link is emailed at sign-up; ordering needs a verified email when SMTP is configured.
  Set `REQUIRE_EMAIL_VERIFICATION=false` to switch this off. Forgot-password sends a one-hour, one-time link.
- Optional `CUSTOMER_SESSION_SECRET` in `.env` (else derived from `ADMIN_SESSION_SECRET`).
- New collections (Customer, PaymentTxn, CustomerLoginAttempt, RateLimit) are created by `npm run dev` automatically (`prisma db push`).

## Payments (manual JazzCash — no gateway)
- Customer signs in -> pays the total to the JazzCash number (`NEXT_PUBLIC_JAZZCASH_ACCOUNT_ID`) -> at checkout enters
  delivery details + the number they paid from + the JazzCash TID.
- Each TID can be used for ONE order only (duplicates are refused). The order arrives as "Verifying".
- The owner gets an email with the customer's details and the TID (subject ends "verify JazzCash TID"), checks the
  TID against the JazzCash account, then presses Verify / Reject in /admin. Rejected -> customer is emailed and can resubmit a corrected TID.
- Every product page has a WhatsApp button (number set in `src/lib/contact.ts`).

## Audit log (/admin → Audit log)
Read-only record kept in the `AuditEntry` collection: customer sign-ups / sign-ins / failed or blocked sign-ins /
password resets, orders placed (with TID), re-submitted TIDs, reviews, owner sign-ins, and every owner action
(payment verified / rejected, order status, product add / edit / delete, review approve / hide, image upload) with time and IP.
Passwords and tokens are never recorded. Nothing in the app edits or deletes entries.
- **Tamper-evident:** each entry is numbered and signed together with the one before it. If anyone edits, deletes or inserts a row
  in the database, **Check integrity** shows a red warning and the exact entry number.
- Repeated hammering of a locked sign-in is logged only once per 15 minutes, so the log cannot be flooded.
- Keep `ADMIN_SESSION_SECRET` (or set `AUDIT_LOG_KEY`) unchanged; if it changes, older entries are reported as "signed with a previous secret".

## Reviews
Only customers whose order was marked **Delivered** can review that product (one review each). A review shows on the website
after you press **Publish** in /admin → Reviews; **Hide** removes it. Only first name + last initial and city are shown.
The star ratings on products and the home-page testimonials come only from these real reviews.

## Stock & tracking
- Products → Stock (pieces): leave empty to not track; `0` shows "Sold out". Each order subtracts automatically (atomic: the last
  piece can only be sold once); cancelling an order gives the pieces back.
- When you press **Mark Shipped**, you can enter the courier and tracking number. The customer is emailed and sees it in My Orders.

## Policy pages
/privacy, /terms and /returns are linked in the footer. Please read them once and adjust anything that does not match how you work
(they are written for your manual-JazzCash flow, 3-day returns, PKR 300 shipping).

## Owner login (/admin)
- Username + password. Run `npx tsx scripts/hash-password.ts`, paste `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
  and `ADMIN_SESSION_SECRET` into `.env` (and your hosting env settings). The plain password is never stored.
- Lockout: 5 wrong tries from one IP → locked 15 min (doubles each time, max 24 h); 10 wrong passwords
  for the real username from anywhere → account locked the same way. Counters live in MongoDB
  (`AdminLoginAttempt`), so run `npx prisma db push` once after updating.
- To change the password, re-run the script and update `ADMIN_PASSWORD_HASH`; existing sessions are signed out.
- To unlock early: delete the rows in the `AdminLoginAttempt` collection (Atlas → Browse Collections).
- Production: serve over HTTPS (session cookie is `Secure` + `HttpOnly` + `SameSite=Strict`).

## Product image upload
- `/api/admin/upload` (admin cookie required) accepts PNG/JPG/WEBP/GIF up to 3 MB, checks the real file
  signature (SVG is rejected) and stores it in MongoDB (`UploadedImage`). It is served publicly at `/uploads/<id>`.
- Needs `npx prisma db push` once (creates the `UploadedImage` collection).
