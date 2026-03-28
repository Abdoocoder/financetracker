import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - Fajrak",
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "Cairo, sans-serif", color: "#e2e8f0", background: "#070B14", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 32, color: "#94a3b8" }}>سياسة الخصوصية</h2>
      <p style={{ color: "#64748b", marginBottom: 32 }}>Last updated: March 2026</p>

      <section style={{ marginBottom: 32, padding: '24px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.2)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#10B981", marginBottom: 12 }}>🔐 من يرى بياناتك؟ / Who Can See Your Data?</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          <strong style={{ color: '#10B981' }}>أنت فقط.</strong> بياناتك محمية بـ Row Level Security — حتى المطور لا يستطيع الوصول لبياناتك إلا في حالات الدعم الفني بإذنك الصريح.
          <br/><br/>
          <strong style={{ color: '#10B981' }}>You only.</strong> Your data is protected by Row Level Security — even the developer cannot access your data except in support cases with your explicit permission.
        </p>
        <ul style={{ lineHeight: 2, color: "#94a3b8", paddingRight: 20, marginTop: 12 }}>
          <li>✅ لا أحد يرى معاملاتك / Nobody sees your transactions</li>
          <li>✅ لا أحد يرى ديونك / Nobody sees your debts</li>
          <li>✅ لا أحد يرى استثماراتك / Nobody sees your investments</li>
          <li>✅ لا إعلانات ولا بيع بيانات / No ads, no data selling</li>
          <li>✅ يمكنك حذف كل بياناتك في أي وقت / Delete all your data anytime</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>1. Data We Collect / البيانات التي نجمعها</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          Fajrak collects only the data you provide: financial transactions, debts, investments, and savings goals.
          All data is stored securely in Supabase and is only accessible by you.
          <br/><br/>
          يجمع فجرك فقط البيانات التي تقدمها: المعاملات المالية والديون والاستثمارات وأهداف الادخار.
          تُخزَّن جميع البيانات بشكل آمن ولا يمكن الوصول إليها إلا من قِبلك.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>2. How We Use Your Data / كيف نستخدم بياناتك</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          Your data is used solely to provide the app features. We do not sell, share, or use your data for advertising.
          <br/><br/>
          تُستخدم بياناتك فقط لتوفير ميزات التطبيق. لا نبيع بياناتك أو نشاركها أو نستخدمها للإعلانات.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>3. Data Security / أمان البيانات</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          All data is encrypted in transit and at rest using Supabase infrastructure with Row Level Security (RLS).
          <br/><br/>
          جميع البيانات مشفرة أثناء النقل وفي حالة الراحة باستخدام بنية Supabase مع أمان مستوى الصفوف.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>4. Third-Party Services / الخدمات الخارجية</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          Fajrak uses the following third-party services to provide its features:
          <br/><br/>
          يستخدم فجرك الخدمات الخارجية التالية لتوفير ميزاته:
        </p>
        <ul style={{ lineHeight: 2, color: "#94a3b8", paddingRight: 20, marginTop: 12 }}>
          <li>🔹 <strong style={{ color: '#cbd5e1' }}>Supabase</strong> — قاعدة البيانات والمصادقة / Database & Authentication</li>
          <li>🔹 <strong style={{ color: '#cbd5e1' }}>Firebase (Google)</strong> — إشعارات Push على Android / Push Notifications on Android</li>
          <li>🔹 <strong style={{ color: '#cbd5e1' }}>Vercel</strong> — استضافة التطبيق / App Hosting</li>
          <li>🔹 <strong style={{ color: '#cbd5e1' }}>CoinGecko</strong> — أسعار العملات الرقمية / Crypto prices (no personal data shared)</li>
        </ul>
        <p style={{ lineHeight: 1.8, color: "#94a3b8", marginTop: 12 }}>
          These services have their own privacy policies. No personal financial data is shared with any third party.
          <br/>
          هذه الخدمات لها سياسات خصوصية خاصة بها. لا تتم مشاركة أي بيانات مالية شخصية مع أي طرف ثالث.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>5. Push Notifications / الإشعارات</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          Fajrak may send push notifications to remind you of financial goals, daily summaries, and Islamic lessons related to wealth. You can disable notifications at any time from your device settings.
          <br/><br/>
          قد يرسل فجرك إشعارات للتذكير بالأهداف المالية والملخصات اليومية والدروس الإسلامية المتعلقة بالثروة. يمكنك تعطيل الإشعارات في أي وقت من إعدادات جهازك.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>6. Children's Privacy / خصوصية الأطفال</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          Fajrak is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.
          <br/><br/>
          فجرك مخصص للمستخدمين الذين تبلغ أعمارهم 13 عامًا فما فوق. لا نجمع معلومات شخصية عن قصد من الأطفال دون سن 13. إذا كنت تعتقد أن طفلاً قدّم لنا معلومات شخصية، يرجى التواصل معنا فورًا.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>7. Delete Your Data / حذف بياناتك</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          You can delete your account and all associated data at any time from Settings → Delete Account.
          <br/><br/>
          يمكنك حذف حسابك وجميع بياناتك المرتبطة به في أي وقت من الإعدادات ← حذف الحساب.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>8. Contact / التواصل</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          For any privacy concerns, contact us at: <a href="mailto:support@fajrak.com" style={{ color: "#3B7EF6" }}>support@fajrak.com</a>
        </p>
      </section>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, color: "#475569", fontSize: 13 }}>
        <Link href="/" style={{ color: "#3B7EF6", textDecoration: "none" }}>← Back to Fajrak</Link>
      </div>
    </div>
  )
}
