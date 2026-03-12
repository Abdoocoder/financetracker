import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - FinanceTracker",
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "Cairo, sans-serif", color: "#e2e8f0", background: "#070B14", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 32, color: "#94a3b8" }}>سياسة الخصوصية</h2>
      <p style={{ color: "#64748b", marginBottom: 32 }}>Last updated: March 2026</p>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>1. Data We Collect / البيانات التي نجمعها</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          FinanceTracker collects only the data you provide: financial transactions, debts, investments, and savings goals.
          All data is stored securely in Supabase and is only accessible by you.
          <br/><br/>
          يجمع FinanceTracker فقط البيانات التي تقدمها: المعاملات المالية والديون والاستثمارات وأهداف الادخار.
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
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>4. Delete Your Data / حذف بياناتك</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          You can delete your account and all associated data at any time from Settings → Delete Account.
          <br/><br/>
          يمكنك حذف حسابك وجميع بياناتك المرتبطة به في أي وقت من الإعدادات ← حذف الحساب.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>5. Contact / التواصل</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          For any privacy concerns, contact us at: <a href="mailto:support@financetracker.app" style={{ color: "#3B7EF6" }}>support@financetracker.app</a>
        </p>
      </section>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, color: "#475569", fontSize: 13 }}>
        <a href="/" style={{ color: "#3B7EF6", textDecoration: "none" }}>← Back to FinanceTracker</a>
      </div>
    </div>
  )
}
