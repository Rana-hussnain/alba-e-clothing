import type { Metadata } from 'next'
import { LegalPage } from '@/components/store/legal-page'

export const metadata: Metadata = { title: 'Privacy Policy — ALBA-E' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2026">
      <section>
        <p>
          This explains what personal information ALBA-E collects when you create an account and order from us, why we need it,
          and how we protect it. We only collect what is needed to run your account and deliver your order.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your name, email address, mobile number and password. The password is stored only as a one-way encrypted hash — nobody, including us, can read it.</li>
          <li><strong>Orders:</strong> delivery name, address, city, postal code, contact number, the items you ordered, the mobile number you paid from and your JazzCash Transaction ID (TID).</li>
          <li><strong>Reviews:</strong> the rating and comment you write, shown with your first name, last initial and city.</li>
          <li><strong>Security records:</strong> when you sign in, fail to sign in, place an order or change your password, we record the time and your IP address. This protects accounts against break-in attempts and lets us investigate fraud.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create and protect your account, and to send you the emails you need (verification, password reset, order and payment updates).</li>
          <li>To check your JazzCash payment against our account, prepare your order and arrange delivery.</li>
          <li>To prevent fake orders, reused Transaction IDs and unauthorised access.</li>
        </ul>
        <p className="mt-3">We do <strong>not</strong> sell your information and we do not send marketing emails without your agreement.</p>
      </section>

      <section>
        <h2>Who sees it</h2>
        <ul>
          <li>The store owner and authorised staff, to fulfil orders.</li>
          <li>Our delivery courier receives your name, address and phone number so that the parcel can reach you.</li>
          <li>Our service providers: the database host (MongoDB Atlas) and the email provider (Gmail), which process data on our behalf.</li>
          <li>Authorities, only when the law requires it.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use one essential cookie that keeps you signed in. It is private to your browser and expires after 7 days or when you sign out.
          We do not use advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Account and order records are kept while your account exists and as long as needed for accounting, returns and fraud prevention.
          Security records are kept for at least one year.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can ask us to show you the information we hold, correct it, or delete your account by contacting us below.
          We may need to keep order records that we are required to keep for tax or dispute purposes.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Passwords are hashed, sign-in is protected against guessing attacks, connections use HTTPS, and every owner action is written to a tamper-evident audit log.
          No system is perfectly secure, so please use a strong, unique password and never share it.
        </p>
      </section>
    </LegalPage>
  )
}
