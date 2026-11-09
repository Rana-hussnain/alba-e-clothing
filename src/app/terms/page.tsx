import type { Metadata } from 'next'
import { LegalPage } from '@/components/store/legal-page'
import { JAZZCASH_ACCOUNT_DISPLAY, JAZZCASH_ACCOUNT_NAME } from '@/lib/contact'

export const metadata: Metadata = { title: 'Terms of Service — ALBA-E' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">
      <section>
        <p>By creating an account or placing an order at ALBA-E you agree to these terms.</p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Only registered customers can place orders. You must give correct details and keep your password private — you are responsible for activity on your account.</li>
          <li>For safety, sign-in is locked for a while after repeated wrong passwords.</li>
          <li>We may suspend an account used for fraud, fake payments or abuse.</li>
        </ul>
      </section>

      <section>
        <h2>Prices and payment</h2>
        <ul>
          <li>Prices are in Pakistani Rupees (PKR). A flat shipping charge of PKR 300 applies to every order.</li>
          <li>Payment is by JazzCash only, paid in full <strong>before</strong> you place the order — there is no cash on delivery.</li>
          <li>Send the total to JazzCash account <strong>{JAZZCASH_ACCOUNT_DISPLAY}</strong> ({JAZZCASH_ACCOUNT_NAME}), then enter your delivery details, the number you paid from and the JazzCash Transaction ID (TID) at checkout.</li>
          <li>We check every TID against our JazzCash account. Your order is confirmed and dispatched only after the payment is verified.</li>
          <li>Each TID can be used for one order only. A TID that is wrong, already used, or does not match the amount will be rejected, and the order will not be dispatched until a correct payment is shown.</li>
        </ul>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          Stock is limited. If an item sells out before we can confirm your order, we will tell you and refund your payment in full to your JazzCash account.
        </p>
      </section>

      <section>
        <h2>Delivery</h2>
        <p>
          We deliver across Pakistan, usually within 2 to 5 working days after payment is verified. The courier phones you before delivery,
          so please keep your contact number reachable and your address correct. Delays caused by the courier or by an incorrect address are outside our control.
        </p>
      </section>

      <section>
        <h2>Returns</h2>
        <p>Returns are accepted within 3 days of delivery under the conditions in our Returns &amp; Refunds page.</p>
      </section>

      <section>
        <h2>Reviews</h2>
        <ul>
          <li>Only customers who received a product can review it. Reviews are published after the owner approves them.</li>
          <li>Be honest and respectful. We may hide reviews that are abusive, unrelated, or contain personal details.</li>
        </ul>
      </section>

      <section>
        <h2>Limits</h2>
        <p>
          We do our best to keep the website accurate and available, but we cannot guarantee it will always be error-free or uninterrupted.
          Product photos are for guidance; colours may look slightly different on your screen. To the extent allowed by law, our liability is limited to the price you paid for the order concerned.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>We may update these terms. The date at the top shows when they last changed; orders are governed by the terms in force when they were placed.</p>
      </section>
    </LegalPage>
  )
}
