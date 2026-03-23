<style>
/* Fajrak Flutter README Modern Styles */
:root {
  --fajrak-primary: #FF6B35;
  --fajrak-secondary: #FFB347;
  --fajrak-accent: #4ECDC4;
  --fajrak-dark: #1A1A2E;
  --fajrak-light: #F7F7F7;
  --gradient-sunset: linear-gradient(135deg, #FF6B35 0%, #FFB347 50%, #FF8E53 100%);
  --gradient-ocean: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-emerald: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-glow: 0 0 40px rgba(255, 107, 53, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
  background: var(--fajrak-light);
  color: #333;
  line-height: 1.8;
  direction: rtl;
  text-align: right;
}

/* Hero Section */
.hero {
  background: var(--gradient-sunset);
  padding: 80px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  animation: pulse 8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
}

.hero-logo {
  font-size: 4rem;
  margin-bottom: 20px;
}

.hero h1 {
  font-size: 2.8rem;
  color: white;
  margin-bottom: 15px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.hero-tagline {
  font-size: 1.3rem;
  color: rgba(255,255,255,0.95);
  margin-bottom: 25px;
  font-weight: 300;
}

/* Badges */
.badges {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
}

.badge {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Container */
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 20px;
}

/* Section Headers */
.section-header {
  text-align: center;
  margin-bottom: 50px;
}

.section-header h2 {
  font-size: 2.2rem;
  background: var(--gradient-sunset);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 15px;
}

.section-header p {
  color: #666;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Feature Cards Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 50px;
}

.feature-card {
  background: white;
  border-radius: 18px;
  padding: 30px;
  box-shadow: var(--shadow-soft);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-sunset);
  transform: scaleX(0);
  transition: transform 0.4s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(255, 107, 53, 0.15);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
  display: block;
}

.feature-card h3 {
  font-size: 1.3rem;
  color: var(--fajrak-dark);
  margin-bottom: 12px;
}

.feature-card p {
  color: #555;
  font-size: 0.95rem;
}

/* Callout Boxes */
.callout {
  padding: 25px 30px;
  border-radius: 15px;
  margin: 25px 0;
  position: relative;
}

.callout-info {
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%);
  border-right: 4px solid var(--fajrak-accent);
}

.callout-warning {
  background: linear-gradient(135deg, rgba(255, 179, 71, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%);
  border-right: 4px solid var(--fajrak-secondary);
}

.callout-success {
  background: linear-gradient(135deg, rgba(56, 239, 125, 0.1) 0%, rgba(56, 239, 125, 0.05) 100%);
  border-right: 4px solid #38ef7d;
}

.callout-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.callout p {
  color: #555;
  margin: 0;
}

/* Quick Start Section */
.quickstart {
  background: white;
  border-radius: 20px;
  padding: 35px;
  box-shadow: var(--shadow-soft);
}

.quickstart h3 {
  font-size: 1.6rem;
  margin-bottom: 20px;
  color: var(--fajrak-dark);
}

.code-block {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px 25px;
  margin: 15px 0;
  overflow-x: auto;
  position: relative;
}

.code-block code {
  color: #e0e0e0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  line-height: 1.8;
  direction: ltr;
  text-align: left;
  display: block;
}

.code-block .comment {
  color: #6a9955;
}

.code-block .command {
  color: #4ec9b0;
}

/* Parity Table */
.parity-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  margin: 25px 0;
}

.parity-table th {
  background: var(--gradient-sunset);
  color: white;
  padding: 15px 18px;
  text-align: right;
  font-weight: 600;
}

.parity-table td {
  padding: 12px 18px;
  border-bottom: 1px solid #eee;
  transition: background 0.3s ease;
}

.parity-table tr:hover td {
  background: rgba(255, 107, 53, 0.03);
}

.parity-table .status {
  color: var(--fajrak-accent);
  font-weight: 600;
}

/* Folder Structure */
.folder-tree {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: var(--shadow-soft);
  direction: ltr;
  text-align: left;
  font-family: 'Fira Code', monospace;
}

.folder-line {
  padding: 5px 0;
  color: #555;
}

.folder-line .folder {
  color: var(--fajrak-primary);
}

.folder-line .file {
  color: #3178c6;
}

/* Tech Stack */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.tech-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.tech-card:hover {
  transform: translateY(-5px);
}

.tech-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.tech-card h4 {
  color: var(--fajrak-dark);
  font-size: 1rem;
}

/* Footer */
.footer {
  background: var(--fajrak-dark);
  color: white;
  padding: 50px 20px;
  text-align: center;
}

.footer p {
  color: rgba(255,255,255,0.7);
  margin-bottom: 8px;
}

.footer-links {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.footer-links a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.footer-links a:hover {
  background: var(--fajrak-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .container {
    padding: 40px 15px;
  }
}
</style>

<div class="hero">
  <div class="hero-content">
    <div class="hero-logo">📱</div>
    <h1>Fajrak Flutter</h1>
    <p class="hero-tagline">تطبيق الأندرويد الأصلي — Native Android App</p>
    
    <div class="badges">
      <span class="badge">✅ 100% Feature Parity</span>
      <span class="badge">📦 54.5 MB APK</span>
      <span class="badge">🎯 Google Play Ready</span>
    </div>
  </div>
</div>

<div class="container">
  
  <!-- Overview Section -->
  <section>
    <div class="section-header">
      <h2>✨ نظرة عامة</h2>
      <p>تطبيق أندرويد أصلي مبني بـ Flutter لمنصة Fajrak لإدارة المالية الشخصية</p>
    </div>
    
    <div class="callout callout-success">
      <div class="callout-title">🎉 متوفر على Google Play</div>
      <p>تم بناء حزمة التطبيق `.aab` ورفعها للاختبار المغلق (Closed Testing) على متجر Google Play بنجاح!</p>
    </div>
  </section>
  
  <!-- Requirements Section -->
  <section>
    <div class="section-header">
      <h2>📋 المتطلبات</h2>
      <p>ما تحتاجه للبدء</p>
    </div>
    
    <div class="feature-grid">
      <div class="feature-card">
        <span class="feature-icon">🦋</span>
        <h3>Flutter SDK</h3>
        <p>`>=3.0.0 <4.0.0` — بيئة التطوير الرئيسية</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔵</span>
        <h3>Android Studio</h3>
        <p>أو VS Code مع Flutter extension</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔥</span>
        <h3>Firebase</h3>
        <p>حساب Firebase مرتبط بالمشروع للإشعارات</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔐</span>
        <h3>google-services.json</h3>
        <p>ملف إعدادات Firebase من Console</p>
      </div>
    </div>
  </section>
  
  <!-- Setup Section -->
  <section>
    <div class="section-header">
      <h2>⚙️ الإعداد</h2>
      <p>خطوات التثبيت السريع</p>
    </div>
    
    <div class="quickstart">
      <h3>📦 1. تثبيت الاعتمادات</h3>
      <div class="code-block">
        <code><span class="command">flutter pub get</span></code>
      </div>
    </div>
    
    <div class="quickstart" style="margin-top: 20px;">
      <h3>🔤 2. إضافة خط Cairo</h3>
      <p style="color: #666; margin-bottom: 15px;">حمّل خط Cairo من <a href="https://fonts.google.com/specimen/Cairo" style="color: var(--fajrak-primary);">Google Fonts</a> وضع الملفات في:</p>
      <div class="code-block">
        <code>
          <span class="file">assets/fonts/Cairo-Regular.ttf</span><br/>
          <span class="file">assets/fonts/Cairo-Bold.ttf</span>
        </code>
      </div>
    </div>
    
    <div class="quickstart" style="margin-top: 20px;">
      <h3>🔐 3. إضافة google-services.json</h3>
      <p style="color: #666; margin-bottom: 15px;">من <a href="https://console.firebase.google.com" style="color: var(--fajrak-primary);">Firebase Console</a> → مشروعك → إعدادات التطبيق:</p>
      <div class="code-block">
        <code><span class="file">android/app/google-services.json</span></code>
      </div>
      
      <div class="callout callout-warning" style="margin-top: 20px;">
        <div class="callout-title">⚠️ ملف محمي</div>
        <p>هذا الملف مدرج في .gitignore ولن يُرفع على GitHub</p>
      </div>
    </div>
    
    <div class="quickstart" style="margin-top: 20px;">
      <h3>🔧 4. متغيرات البيئة (اختياري)</h3>
      <p style="color: #666; margin-bottom: 15px;">بشكل افتراضي يستخدم التطبيق قيم Supabase المضمّنة:</p>
      <div class="code-block">
        <code>
          <span class="command">flutter run</span> \<br/>
          &nbsp;&nbsp;--dart-define=<span class="file">SUPABASE_URL</span>=https://your-project.supabase.co \<br/>
          &nbsp;&nbsp;--dart-define=<span class="file">SUPABASE_ANON_KEY</span>=your_anon_key
        </code>
      </div>
    </div>
  </section>
  
  <!-- Build Section -->
  <section>
    <div class="section-header">
      <h2>🚀 التشغيل والبناء</h2>
      <p>كيفية تشغيل التطبيق</p>
    </div>
    
    <div class="quickstart">
      <h3>⚡ أوامر سريعة</h3>
      <div class="code-block">
        <code>
          <span class="comment"># تشغيل في وضع التطوير</span><br/>
          <span class="command">flutter run</span><br/><br/>
          <span class="comment"># بناء APK للتوزيع</span><br/>
          <span class="command">flutter build apk --release</span>
        </code>
      </div>
      
      <div class="callout callout-info" style="margin-top: 20px;">
        <div class="callout-title">📦 موقع الـ APK</div>
        <p>الـ APK الناتج يكون في:<br/><code>build/app/outputs/flutter-apk/app-release.apk</code></p>
      </div>
    </div>
  </section>
  
  <!-- Structure Section -->
  <section>
    <div class="section-header">
      <h2>📁 هيكل المشروع</h2>
      <p>تنظيم الملفات والمجلدات</p>
    </div>
    
    <div class="folder-tree">
      <div class="folder-line"><span class="folder">lib/</span></div>
      <div class="folder-line">&nbsp;&nbsp;├── <span class="file">main.dart</span> — نقطة الدخول + إعداد Theme</div>
      <div class="folder-line">&nbsp;&nbsp;├── <span class="folder">screens/</span></div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">auth/</span> — تسجيل الدخول، التسجيل، الإعداد</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">dashboard/</span> — الصفحة الرئيسية</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">transactions/</span> — المعاملات المالية</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">debts/</span> — الديون</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">investments/</span> — الاستثمارات</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">goals/</span> — أهداف الادخار</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">budgets/</span> — الميزانية</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">alerts/</span> — التنبيهات</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <span class="folder">settings/</span> — الإعدادات</div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── <span class="folder">more/</span> — صفحات إضافية</div>
      <div class="folder-line">&nbsp;&nbsp;├── <span class="folder">services/</span></div>
      <div class="folder-line">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── <span class="file">notification_service.dart</span> — Firebase FCM</div>
      <div class="folder-line">&nbsp;&nbsp;├── <span class="folder">models/</span> — نماذج البيانات</div>
      <div class="folder-line">&nbsp;&nbsp;└── <span class="folder">widgets/</span> — مكونات مشتركة</div>
    </div>
  </section>
  
  <!-- Tech Stack Section -->
  <section>
    <div class="section-header">
      <h2>🛠️ التقنيات المستخدمة</h2>
      <p>المكتبات والأدوات</p>
    </div>
    
    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-icon">🦋</div>
        <h4>Flutter 3.x</h4>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔷</div>
        <h4>Dart</h4>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🗄️</div>
        <h4>Supabase</h4>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔥</div>
        <h4>Firebase FCM</h4>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">📊</div>
        <h4>fl_chart</h4>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🌐</div>
        <h4>share_plus</h4>
      </div>
    </div>
  </section>
  
  <!-- Backend Section -->
  <section>
    <div class="section-header">
      <h2>🔗 Backend مشترك</h2>
      <p>التكامل مع تطبيق الويب</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🗄️</span>
        <h3>قاعدة البيانات</h3>
        <p>نفس Supabase والجداول</p>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🔐</span>
        <h3>المصادقة</h3>
        <p>نفس نظام Auth</p>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🔔</span>
        <h3>الإشعارات</h3>
        <p>نفس Firebase FCM</p>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">📱</span>
        <h3>مزامنة كاملة</h3>
        <p>نفس الحساب على الويب والموبايل</p>
      </div>
    </div>
  </section>
  
  <!-- Parity Section -->
  <section>
    <div class="section-header">
      <h2>📊 حالة التطابق</h2>
      <p>100% Feature Parity مع نسخة الويب</p>
    </div>
    
    <table class="parity-table">
      <thead>
        <tr>
          <th>الميزة</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Dashboard</strong> — التحليلات، Health Score، Gamification</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Transactions</strong> — إضافة، CSV، المشاركة</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Investments</strong> — مبدل العملات، الأسعار، المحاكي</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Debts & Goals</strong> — تواريخ، Emoji Picker، Confetti</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Settings & Learn</strong> — اللغة/الثيم، Financial Roadmap</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Budgets & Alerts</strong> — تحليل تلقائي، AI Advisor</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Core Systems</strong> — ErrorHandler، AnalyticsService</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
        <tr>
          <td><strong>Onboarding</strong> — 4 خطوات تفاعلية</td>
          <td><span class="status">✅ 100%</span></td>
        </tr>
      </tbody>
    </table>
  </section>
  
</div>

<!-- Footer -->
<div class="footer">
  <p><strong>🌅 Fajrak — فجرك</strong></p>
  <p>مبني بـ ❤️ من الأردن للعالم العربي</p>
  <p>© 2026 Fajrak</p>
  
  <div class="footer-links">
    <a href="https://github.com/Abdoocoder/financetracker" target="_blank">💻 GitHub</a>
    <a href="https://fajrak.com" target="_blank">🌐 الموقع</a>
  </div>
</div>
