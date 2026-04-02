import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service - Fajrak",
}

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "Cairo, sans-serif", color: "#e2e8f0", background: "#070B14", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Terms of Service</h1>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 32, color: "#94a3b8" }}>شروط الخدمة</h2>
      <p style={{ color: "#64748b", marginBottom: 32 }}>Last updated: April 2026</p>

      <section style={{ marginBottom: 32, padding: '24px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.2)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>⚖️ طبيعة الخدمة / Nature of Service</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          تطبيق <strong style={{ color: '#3B7EF6' }}>فجرك (Fajrak)</strong> هو أداة تقنية وإرشادية لإدارة المالية الشخصية. 
          <br/><br/>
          <strong style={{ color: '#3B7EF6' }}>Fajrak</strong> is a technical and advisory tool for personal financial management.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>1. Educational Purpose / الغرض التعليمي</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          المعلومات والحسابات التي يقدمها التطبيق (مثل حاسبة الزكاة أو مؤشر الحرية المالية) هي لأغراض تعليمية وإرشادية فقط. لا يعد التطبيق مستشاراً مالياً أو قانونياً أو شرعياً رسمياً.
          <br/><br/>
          The information and calculations provided by the app (e.g., Zakat calculator or FIRE index) are for educational and guidance purposes only. The app is not a formal financial, legal, or Sharia advisor.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>2. Data Responsibility / مسؤولية البيانات</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          أنت المسؤول الوحيد عن دقة البيانات التي تدخلها في التطبيق وعن الحفاظ على سرية معلومات حسابك. فجرك غير مسؤول عن أي قرارات مالية تتخذها بناءً على البيانات المعروضة.
          <br/><br/>
          You are solely responsible for the accuracy of the data you enter and for maintaining the confidentiality of your account information. Fajrak is not responsible for any financial decisions you make based on the displayed data.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>3. Availability / توفر الخدمة</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          نسعى لتوفير الخدمة بأعلى موثوقية، ولكننا لا نضمن عدم حدوث انقطاعات تقنية خارجة عن إرادتنا ناتجة عن خدمات الطرف الثالث (مثل Vercel أو Supabase).
          <br/><br/>
          We strive to provide service with high reliability, but we do not guarantee against technical interruptions beyond our control caused by third-party services (e.g., Vercel or Supabase).
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>4. Modifications / تعديلات الخدمة</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          نحتفظ بالحق في تعديل أو وقف أي جزء من الخدمة في أي وقت. سنقوم بإشعار المستخدمين بأي تغييرات جوهرية في هذه الشروط عبر البريد الإلكتروني أو إشعارات التطبيق.
          <br/><br/>
          We reserve the right to modify or discontinue any part of the service at any time. We will notify users of any material changes to these terms via email or app notifications.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#10B981", marginBottom: 12 }}>5. Content & Integrity / المحتوى والنزاهة</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          يلتزم فجرك بتقديم محتوى يتوافق مع القيم والأخلاقيات الإسلامية في التجارة والعمل. يمنع استخدام التطبيق في أي أنشطة غير قانونية أو تتعارض مع هذه القيم.
          <br/><br/>
          Fajrak is committed to providing content that aligns with Islamic values and ethics in trade and work. Using the app for any illegal activities or those conflicting with these values is prohibited.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>6. Contact / التواصل</h3>
        <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
          لأي استفسارات بخصوص شروط الخدمة، يرجى التواصل معنا عبر: <a href="mailto:legal@fajrak.com" style={{ color: "#3B7EF6" }}>legal@fajrak.com</a>
        </p>
      </section>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, color: "#475569", fontSize: 13 }}>
        <Link href="/" style={{ color: "#3B7EF6", textDecoration: "none" }}>← Back to Fajrak</Link>
      </div>
    </div>
  )
}
