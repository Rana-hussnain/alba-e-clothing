import type { Metadata } from 'next'
import { LegalPage } from '@/components/store/legal-page'

export const metadata: Metadata = { title: 'Returns & Refunds — ALBA-E' }

export default function ReturnsPage() {
  return (
    <LegalPage title="Returns & Refunds" updated="November 2026">
      <section>
        <h2>Return window</h2>
        <p>Returns are available <strong>within 3 days</strong> of receiving your order. After 3 days we cannot accept returns.</p>
      </section>

      <section>
        <h2>What can be returned</h2>
        <ul>
          <li>Items that are unworn, unwashed and in their original packaging with all tags attached.</li>
          <li>Items that arrived damaged, defective or different from what you ordered.</li>
        </ul>
      </section>

      <section>
        <h2>How to return</h2>
        <ul>
          <li>Contact us on WhatsApp or email within 3 days with your order number and clear photos of the item.</li>
          <li>We will confirm whether the return is accepted and tell you where to send the parcel.</li>
        </ul>
      </section>

      <section>
        <h2>Refunds</h2>
        <ul>
          <li>Once we receive and inspect the returned item, we refund the product price to the JazzCash number you paid from.</li>
          <li>If the item was damaged, defective or wrong, we also refund the shipping charge and the return courier cost.</li>
          <li>Refunds are normally sent within 3 to 5 working days after approval.</li>
          <li>If an item sold out before your order was confirmed, you receive a full refund including shipping.</li>
        </ul>
      </section>
    </LegalPage>
  )
}
