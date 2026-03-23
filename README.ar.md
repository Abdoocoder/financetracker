<style>
/* Fajrak Arabic README Modern Styles */
:root {
  --fajrak-primary: #FF6B35;
  --fajrak-secondary: #FFB347;
  --fajrak-accent: #4ECDC4;
  --fajrak-dark: #1A1A2E;
  --fajrak-light: #F7F7F7;
  --gradient-sunset: linear-gradient(135deg, #FF6B35 0%, #FFB347 50%, #FF8E53 100%);
  --gradient-ocean: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-emerald: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --gradient-coral: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
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
  width: 120px;
  height: 120px;
  border-radius: 30px;
  box-shadow: var(--shadow-glow);
  margin-bottom: 30px;
  transition: transform 0.3s ease;
}

.hero-logo:hover {
  transform: scale(1.1) rotate(-5deg);
}

.hero h1 {
  font-size: 3.5rem;
  color: white;
  margin-bottom: 15px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.hero-tagline {
  font-size: 1.4rem;
  color: rgba(255,255,255,0.95);
  margin-bottom: 30px;
  font-weight: 300;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: rgba(255,255,255,0.9);
  font-style: italic;
}

/* Navigation Pills */
.nav-pills {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
}

.nav-pill {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 50px;
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid rgba(255,255,255,0.3);
}

.nav-pill:hover {
  background: rgba(255,255,255,0.35);
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

/* Language Switch */
.lang-switch {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  padding: 10px 20px;
  border-radius: 50px;
  display: inline-flex;
  gap: 10px;
  margin-top: 25px;
}

.lang-switch a {
  color: white;
  text-decoration: none;
  padding: 5px 15px;
  border-radius: 20px;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.lang-switch a:hover, .lang-switch a.active {
  background: rgba(255,255,255,0.3);
  opacity: 1;
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;
}

/* Section Headers */
.section-header {
  text-align: center;
  margin-bottom: 50px;
}

.section-header h2 {
  font-size: 2.5rem;
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
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 35px;
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
  transform: translateY(-10px);
  box-shadow: 0 20px 50px rgba(255, 107, 53, 0.15);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  display: block;
}

.feature-card h3 {
  font-size: 1.4rem;
  color: var(--fajrak-dark);
  margin-bottom: 15px;
}

.feature-card ul {
  list-style: none;
  padding: 0;
}

.feature-card li {
  padding: 8px 0;
  padding-right: 25px;
  position: relative;
  color: #555;
  transition: color 0.3s ease;
}

.feature-card li::before {
  content: '←';
  position: absolute;
  right: 0;
  color: var(--fajrak-primary);
  transition: transform 0.3s ease;
}

.feature-card li:hover {
  color: var(--fajrak-primary);
}

.feature-card li:hover::before {
  transform: translateX(5px);
}

/* Callout Boxes */
.callout {
  padding: 25px 30px;
  border-radius: 15px;
  margin: 30px 0;
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
  padding: 40px;
  box-shadow: var(--shadow-soft);
}

.quickstart h3 {
  font-size: 1.8rem;
  margin-bottom: 25px;
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
  font-size: 0.95rem;
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

.code-block .string {
  color: #ce9178;
}

/* Tech Stack Cards */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
  margin: 40px 0;
}

.tech-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  text-align: center;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.tech-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.1);
}

.tech-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.tech-card h4 {
  color: var(--fajrak-dark);
  margin-bottom: 8px;
}

.tech-card p {
  color: #666;
  font-size: 0.9rem;
}

.tech-badge {
  display: inline-block;
  background: var(--gradient-sunset);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.8rem;
  margin-top: 12px;
}

/* Roadmap */
.roadmap {
  position: relative;
  padding-right: 40px;
}

.roadmap::before {
  content: '';
  position: absolute;
  right: 15px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--fajrak-primary), var(--fajrak-accent));
  border-radius: 3px;
}

.roadmap-item {
  position: relative;
  padding: 20px 0;
  padding-right: 30px;
}

.roadmap-item::before {
  content: '';
  position: absolute;
  right: -32px;
  top: 25px;
  width: 16px;
  height: 16px;
  background: white;
  border: 3px solid var(--fajrak-primary);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.roadmap-item:hover::before {
  background: var(--fajrak-primary);
  transform: scale(1.2);
}

.roadmap-item.completed::before {
  background: var(--fajrak-accent);
  border-color: var(--fajrak-accent);
}

.roadmap-item h4 {
  color: var(--fajrak-dark);
  margin-bottom: 8px;
  font-size: 1.1rem;
}

.roadmap-item p {
  color: #666;
  font-size: 0.95rem;
}

/* Changelog Styles */
.changelog {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: var(--shadow-soft);
}

.version {
  border-bottom: 1px solid #eee;
  padding: 25px 0;
}

.version:last-child {
  border-bottom: none;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.version-number {
  background: var(--gradient-sunset);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.version-date {
  color: #999;
  font-size: 0.9rem;
}

.version-features {
  list-style: none;
  padding: 0;
}

.version-features li {
  padding: 8px 0;
  padding-right: 30px;
  position: relative;
  color: #555;
}

.version-features li::before {
  content: '✨';
  position: absolute;
  right: 0;
}

/* Security Badge */
.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.security-item {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.security-item:hover {
  transform: scale(1.05);
}

.security-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

/* Comparison Table */
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  margin: 30px 0;
}

.comparison-table th {
  background: var(--gradient-sunset);
  color: white;
  padding: 18px 20px;
  text-align: right;
  font-weight: 600;
}

.comparison-table td {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  transition: background 0.3s ease;
}

.comparison-table tr:hover td {
  background: rgba(255, 107, 53, 0.03);
}

.comparison-table .status-yes {
  color: var(--fajrak-accent);
  font-weight: 600;
}

/* Footer */
.footer {
  background: var(--fajrak-dark);
  color: white;
  padding: 60px 20px;
  text-align: center;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
}

.footer-logo {
  font-size: 2rem;
  margin-bottom: 15px;
}

.footer p {
  color: rgba(255,255,255,0.7);
  margin-bottom: 10px;
}

.footer-links {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 25px;
}

.footer-links a {
  color: white;
  text-decoration: none;
  padding: 10px 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 25px;
  transition: all 0.3s ease;
}

.footer-links a:hover {
  background: var(--fajrak-primary);
  transform: translateY(-3px);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section {
  animation: fadeInUp 0.8s ease-out;
}

/* Gamification Box */
.gamification-box {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 179, 71, 0.05) 100%);
  border-radius: 20px;
  padding: 30px;
  margin: 30px 0;
  border: 2px solid rgba(255, 107, 53, 0.1);
}

.gamification-box h3 {
  color: var(--fajrak-primary);
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.level-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.level-item {
  background: white;
  padding: 15px;
  border-radius: 12px;
  text-align: center;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.level-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.2rem;
  }
  
  .hero-tagline {
    font-size: 1.1rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header h2 {
    font-size: 1.8rem;
  }
  
  .container {
    padding: 40px 15px;
  }
}
</style>

<div class="hero">
  <div class="hero-content">
    <img src="https://fajrak.com/icon-192.png" alt="شعار فجرك" class="hero-logo" />
    
    <h1>Fajrak — فجرك 🌅</h1>
    <p class="hero-tagline">منصة إدارة مالية شخصية ذكية</p>
    <p class="hero-subtitle">Smart Personal Finance Manager</p>
    
    <div class="nav-pills">
      <a href="https://fajrak.com" class="nav-pill">🌐 العرض التجريبي</a>
      <a href="https://fajrak.com/download" class="nav-pill">📱 التحميل</a>
      <a href="https://github.com/Abdoocoder/financetracker" class="nav-pill">💻 الكود المصدري</a>
    </div>
    
    <div class="lang-switch">
      <a href="./README.md">🇬🇧 English</a>
      <a href="./README.ar.md" class="active">🇸🇦 العربية</a>
    </div>
  </div>
</div>

<div class="container">
  
  <!-- Vision Section -->
  <section class="section">
    <div class="section-header">
      <h2>✨ رؤيتنا</h2>
      <p>تمكين الوعي المالي لكل أسرة عربية</p>
    </div>
    
    <div class="callout callout-info">
      <div class="callout-title">🌟 بيان الرؤية</div>
      <p>أن يكون كل إنسان على دراية كاملة بوضعه المالي، ويملك خطة واضحة للتحسين — بغض النظر عن دخله أو مستواه — حتى ينجح في تحقيق <strong>حريته المالية</strong>.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(5, 1fr);">
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">🌅</div>
        <div style="font-weight: 600; margin-top: 10px;">وعي مالي</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">💳</div>
        <div style="font-weight: 600; margin-top: 10px;">سداد الديون</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">🛡️</div>
        <div style="font-weight: 600; margin-top: 10px;">صندوق طوارئ</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">📈</div>
        <div style="font-weight: 600; margin-top: 10px;">استثمار</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">👑</div>
        <div style="font-weight: 600; margin-top: 10px;">حرية مالية</div>
      </div>
    </div>
  </section>
  
  <!-- Screenshots Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📸 لقطات الشاشة</h2>
      <p>شاهد فجرك في action</p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px;">
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/welcome.jpeg" alt="شاشة الترحيب" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">🌅 الترحيب</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/login.jpeg" alt="شاشة الدخول" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">🔐 الدخول</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/regester.jpeg" alt="شاشة التسجيل" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">📝 التسجيل</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/settings.jpeg" alt="شاشة الإعدادات" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">⚙️ الإعدادات</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/more.jpeg" alt="المزيد من الميزات" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">📱 المزيد</div>
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(255, 179, 71, 0.05)); border-radius: 15px; padding: 30px; text-align: center;">
      <img src="./public/fajrak_feature_graphic.png" alt="Fajrak Feature Graphic" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: var(--shadow-soft);" />
      <p style="margin-top: 15px; color: #666; font-size: 0.95rem;">📱 فجرك — مدير المالية الشخصية الذكي</p>
    </div>
  </section>
  
  <!-- Features Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🚀 الميزات الرئيسية</h2>
      <p>كل ما تحتاجه لإدارة أموالك باحترافية</p>
    </div>
    
    <div class="feature-grid">
      <div class="feature-card">
        <span class="feature-icon">🏠</span>
        <h3>لوحة التحكم</h3>
        <ul>
          <li>ملخص شهري: الدخل، المصروف، الصافي</li>
          <li>نقاط الصحة المالية — من 0 إلى 100</li>
          <li>خارطة الثراء — 5 مراحل مالية</li>
          <li>محاكي الثروة — حساب نمو الفائض</li>
          <li>تحديات الادخار — 4 تحديات تلقائية</li>
          <li>رسوم بيانية تفاعلية مع Recharts</li>
          <li>إضافة سريعة مع تكرار آخر معاملة</li>
          <li><strong>تحسين الأداء بنسبة 94%</strong></li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💸</span>
        <h3>المعاملات المالية</h3>
        <ul>
          <li>إضافة / تعديل / حذف المعاملات</li>
          <li>معاملات متكررة — تنفذ تلقائياً</li>
          <li>قادمة ومنجزة</li>
          <li>بحث نصي + فلترة بالنوع والشهر</li>
          <li>سحب للحذف على الموبايل</li>
          <li>تصدير CSV</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💳</span>
        <h3>إدارة الديون</h3>
        <ul>
          <li>شريط تقدم مرئي</li>
          <li>خصم تلقائي شهري (CRON)</li>
          <li>تحديد يوم الخصم لكل دين</li>
          <li>سجل كامل للدفعات</li>
          <li>احتفال Confetti عند السداد الكامل</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📊</span>
        <h3>الميزانية الذكية</h3>
        <ul>
          <li>ملخص تلقائي من بيانات التطبيق</li>
          <li>مستشار مالي ذكي — تحليل وتوصيات</li>
          <li>قاعدة 50/30/20 — توزيع تلقائي</li>
          <li>حدود إنفاق يدوية لكل فئة</li>
          <li>تحذيرات عند الاقتراب أو التجاوز</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📈</span>
        <h3>الاستثمارات</h3>
        <ul>
          <li>أسهم + عملات رقمية (15+ عملة)</li>
          <li>أسعار حية محدثة</li>
          <li>دعم الاستثمار الحلال ✅</li>
          <li>محاكي الثروة التفاعلي</li>
          <li>ملخص المحفظة الاستثمارية</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔔</span>
        <h3>التنبيهات الذكية</h3>
        <ul>
          <li>Firebase FCM للأندرويد</li>
          <li>Web Push للآيفون</li>
          <li>تقارير صباحية ومسائية وأسبوعية</li>
          <li>سياسة ذكية — إشعارات مفيدة فقط</li>
          <li>إدارة اشتراكات Push</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📖</span>
        <h3>الدروس اليومية الإسلامية</h3>
        <ul>
          <li>آيات قرآنية عن الرزق</li>
          <li>أحاديث عن الأخلاق المالية</li>
          <li>أدعية يومية</li>
          <li>مخصصة حسب مرحلتك المالية</li>
          <li>25 درس علمي جديد</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🎯</span>
        <h3>نظام الإنجازات</h3>
        <ul>
          <li>نظام مستويات حسب نقاط الصحة</li>
          <li>شارات الإنجاز</li>
          <li>تتبع السلسلة اليومية</li>
          <li>معالم التعلم</li>
          <li>تحديات مالية</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Mobile Apps Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📱 منصات الهاتف</h2>
      <p>استخدم فجرك من أي جهاز</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🤖</span>
        <h3>أندرويد</h3>
        <p style="color: #666; margin: 15px 0;">تطبيق Flutter أصلي مع كامل الميزات</p>
        <div style="background: linear-gradient(135deg, #34A853, #4285F4); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ متوفر على Play Store</div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🌐</span>
        <h3>PWA / TWA</h3>
        <p style="color: #666; margin: 15px 0;">تطبيق ويب متقدم مع إنشاء APK</p>
        <div style="background: var(--gradient-sunset); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ تحميل APK</div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🍎</span>
        <h3>آيفون</h3>
        <p style="color: #666; margin: 15px 0;">إضافة إلى الشاشة الرئيسية PWA</p>
        <div style="background: var(--gradient-ocean); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ مدعوم</div>
      </div>
    </div>
  </section>
  
  <!-- Tech Stack Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>⚙️ التقنيات المستخدمة</h2>
      <p>مبني بأحدث التقنيات الحديثة</p>
    </div>
    
    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-icon">⚡</div>
        <h4>Next.js 15</h4>
        <p>إطار عمل React مع App Router و SSR</p>
        <span class="tech-badge">إطار العمل</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔷</div>
        <h4>TypeScript</h4>
        <p>سلامة كاملة للأنواع</p>
        <span class="tech-badge">اللغة</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🗄️</div>
        <h4>Supabase</h4>
        <p>قاعدة بيانات PostgreSQL و Auth و RLS</p>
        <span class="tech-badge">الخادم</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔥</div>
        <h4>Firebase</h4>
        <p>Cloud Messaging للإشعارات (FCM)</p>
        <span class="tech-badge">الإشعارات</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">📱</div>
        <h4>Flutter 3.x</h4>
        <p>تطبيق أندرويد أصلي</p>
        <span class="tech-badge">الهاتف</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🚀</div>
        <h4>Vercel</h4>
        <p>نشر بدون خادم مع edge functions</p>
        <span class="tech-badge">الاستضافة</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">📊</div>
        <h4>Recharts</h4>
        <p>رسوم بيانية تفاعلية</p>
        <span class="tech-badge">الرسوم</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">⏰</div>
        <h4>cron-job.org</h4>
        <p>أتمتة مجدولة (عمان UTC+3)</p>
        <span class="tech-badge">الأتمتة</span>
      </div>
    </div>
  </section>
  
  <!-- Database Schema Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🗄️ هيكل قاعدة البيانات</h2>
      <p>نموذج بيانات شامل مع حماية RLS</p>
    </div>
    
    <div class="callout callout-success">
      <div class="callout-title">🔒 أمان أولاً</div>
      <p>جميع الجداول محمية بـ <strong>Row Level Security (RLS)</strong>، مما يضمن أن كل مستخدم يمكنه الوصول لبياناته فقط.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>📋 الجداول الأساسية</h4>
        <ul style="text-align: right; margin-top: 15px;">
          <li>profiles — بيانات المستخدم</li>
          <li>transactions — المعاملات</li>
          <li>debts — الديون</li>
          <li>debt_payments — سجل الدفعات</li>
        </ul>
      </div>
      
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>💰 المالي</h4>
        <ul style="text-align: right; margin-top: 15px;">
          <li>investments — الاستثمارات</li>
          <li>budgets — الميزانيات</li>
          <li>savings_goals — أهداف الادخار</li>
        </ul>
      </div>
      
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>🔔 النظام</h4>
        <ul style="text-align: right; margin-top: 15px;">
          <li>alerts — التنبيهات</li>
          <li>push_subscriptions — الاشتراكات</li>
          <li>user_stats — الإحصائيات</li>
          <li>testimonials — التقييمات</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Automation Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>⏰ الأتمتة اليومية</h2>
      <p>تشغيل ذكي عبر cron-job.org (توقيت عمان UTC+3)</p>
    </div>
    
    <table class="comparison-table">
      <thead>
        <tr>
          <th>الوقت</th>
          <th>المهمة</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>6:00 صباحاً</strong></td>
          <td>تنبيهات صباحية + تنبيهات ذكية</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
        <tr>
          <td><strong>8:00 صباحاً</strong></td>
          <td>إضافة الراتب التلقائي (صامت)</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
        <tr>
          <td><strong>9:00 صباحاً</strong></td>
          <td>خصم الأقساط التلقائي (صامت)</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
        <tr>
          <td><strong>6:00 مساءً</strong></td>
          <td>تذكير مسائي (عند الحاجة)</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
        <tr>
          <td><strong>7:00 مساءً</strong></td>
          <td>نصيحة بناء الثروة اليومية</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
        <tr>
          <td><strong>الجمعة</strong></td>
          <td>تقرير المقارنة الأسبوعي</td>
          <td><span class="status-yes">نشط</span></td>
        </tr>
      </tbody>
    </table>
  </section>
  
  <!-- Gamification Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🎮 نظام الإنجازات</h2>
      <p>حوّل إدارة المال إلى رحلة ممتعة</p>
    </div>
    
    <div class="gamification-box">
      <h3>📊 النقاط والمستويات</h3>
      <div class="level-list">
        <div class="level-item">
          <div style="font-size: 2rem;">🌱</div>
          <div style="font-weight: 600;">مبتدئ</div>
          <div style="color: #666; font-size: 0.9rem;">0-49 نقطة</div>
        </div>
        <div class="level-item">
          <div style="font-size: 2rem;">🔥</div>
          <div style="font-weight: 600;">متتبع</div>
          <div style="color: #666; font-size: 0.9rem;">50-149 نقطة</div>
        </div>
        <div class="level-item">
          <div style="font-size: 2rem;">💪</div>
          <div style="font-weight: 600;">مدخر</div>
          <div style="color: #666; font-size: 0.9rem;">150-349 نقطة</div>
        </div>
        <div class="level-item">
          <div style="font-size: 2rem;">📈</div>
          <div style="font-weight: 600;">مستثمر</div>
          <div style="color: #666; font-size: 0.9rem;">350-699 نقطة</div>
        </div>
        <div class="level-item">
          <div style="font-size: 2rem;">💎</div>
          <div style="font-weight: 600;">ثري مبتدئ</div>
          <div style="color: #666; font-size: 0.9rem;">700-1199 نقطة</div>
        </div>
        <div class="level-item">
          <div style="font-size: 2rem;">👑</div>
          <div style="font-weight: 600;">حر مالياً</div>
          <div style="color: #666; font-size: 0.9rem;">1200+ نقطة</div>
        </div>
      </div>
    </div>
    
    <div class="callout callout-info">
      <div class="callout-title">🔥 السلسلة اليومية</div>
      <p>كل يوم تسجّل فيه معاملة تكسب نقطة وتحافظ على سلسلتك!</p>
    </div>
  </section>
  
  <!-- Quick Start Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🚀 البدء السريع</h2>
      <p>ابدأ في أقل من 5 دقائق</p>
    </div>
    
    <div class="quickstart">
      <h3>📦 التثبيت</h3>
      
      <div class="code-block">
        <code>
          <span class="comment"># 1. استنساخ المشروع</span><br/>
          <span class="command">git clone</span> https://github.com/Abdoocoder/financetracker.git<br/><br/>
          <span class="comment"># 2. الانتقال للمجلد</span><br/>
          <span class="command">cd</span> financetracker<br/><br/>
          <span class="comment"># 3. تثبيت المكتبات</span><br/>
          <span class="command">npm install</span><br/><br/>
          <span class="comment"># 4. نسخ ملف البيئة</span><br/>
          <span class="command">cp</span> .env.local.example .env.local<br/><br/>
          <span class="comment"># 5. تشغيل الخادم</span><br/>
          <span class="command">npm run dev</span>
        </code>
      </div>
      
      <div class="callout callout-warning">
        <div class="callout-title">⚠️ إعداد البيئة</div>
        <p>اضبط ملف <code>.env.local</code> بمعلومات Supabase و Firebase قبل التشغيل.</p>
      </div>
    </div>
  </section>
  
  <!-- Testing Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🧪 الاختبارات</h2>
      <p>مجموعة اختبارات شاملة مع Jest</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">✅</span>
        <h3>تشغيل الاختبارات</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px; direction: ltr;">
          <code><span class="command">npm test</span></code>
        </div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">👀</span>
        <h3>وضع المراقبة</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px; direction: ltr;">
          <code><span class="command">npm run test:watch</span></code>
        </div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">📊</span>
        <h3>التغطية</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px; direction: ltr;">
          <code><span class="command">npm run test:coverage</span></code>
        </div>
      </div>
    </div>
    
    <div class="callout callout-info" style="margin-top: 30px;">
      <div class="callout-title">📈 إحصائيات التغطية</div>
      <p><strong>lib/cache.ts:</strong> 83.33% | <strong>types/index.ts:</strong> 100% | <strong>lib/currency.ts:</strong> 30.76%</p>
    </div>
  </section>
  
  <!-- Security Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🔐 ميزات الأمان</h2>
      <p>إجراءات أمان بمستوى المؤسسات</p>
    </div>
    
    <div class="security-grid">
      <div class="security-item">
        <div class="security-icon">🛡️</div>
        <h4>Row Level Security</h4>
        <p>تحكم في الوصول على مستوى قاعدة البيانات</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔑</div>
        <h4>Middleware Auth</h4>
        <p>حماية مسارات لوحة التحكم</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔒</div>
        <h4>CRON Secret</h4>
        <p>حماية روابط API</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔥</div>
        <h4>Firebase Admin</h4>
        <p>إشعارات آمنة</p>
      </div>
    </div>
  </section>
  
  <!-- Roadmap Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🗺️ خارطة الطريق</h2>
      <p>الميزات والتحسينات المخططة</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: 1fr 1fr;">
      <div>
        <h3 style="color: #38ef7d; margin-bottom: 20px;">✅ مكتمل</h3>
        <div class="roadmap">
          <div class="roadmap-item completed">
            <h4>Auth + Onboarding + PWA</h4>
            <p>نظام مصادقة كامل مع تطبيق ويب متقدم</p>
          </div>
          <div class="roadmap-item completed">
            <h4>المعاملات + الديون + الاستثمارات</h4>
            <p>مجموعة إدارة مالية شاملة</p>
          </div>
          <div class="roadmap-item completed">
            <h4>إشعارات ذكية (iOS + Android FCM)</h4>
            <p>إشعارات عبر المنصات</p>
          </div>
          <div class="roadmap-item completed">
            <h4>الميزانية + الصحة المالية</h4>
            <p>تتبع الميزانية وخارطة الثراء</p>
          </div>
          <div class="roadmap-item completed">
            <h4>الإنجازات + الدروس الإسلامية</h4>
            <p>محتوى تعليمي وإنجازات</p>
          </div>
          <div class="roadmap-item completed">
            <h4>تطبيق Flutter للأندرويد</h4>
            <p>APK على Google Play (54.5 MB)</p>
          </div>
          <div class="roadmap-item completed">
            <h4>دومين fajrak.com</h4>
            <p>نشر مع SSL</p>
          </div>
        </div>
      </div>
      
      <div>
        <h3 style="color: var(--fajrak-primary); margin-bottom: 20px;">📋 قيد التطوير</h3>
        <div class="roadmap">
          <div class="roadmap-item">
            <h4>تقارير PDF شهرية</h4>
            <p>إنشاء ملخصات مالية قابلة للتحميل</p>
          </div>
          <div class="roadmap-item">
            <h4>نظام الاشتراكات (Paddle)</h4>
            <p>ميزات مدفوعة مع معالجة الدفع</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Changelog Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📝 سجل التغييرات</h2>
      <p>أحدث التحديثات والتحسينات</p>
    </div>
    
    <div class="changelog">
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.10.0</span>
          <span class="version-date">23 مارس 2026</span>
          <span style="background: var(--gradient-emerald); color: white; padding: 3px 10px; border-radius: 10px; font-size: 0.75rem;">الأحدث</span>
        </div>
        <ul class="version-features">
          <li><strong>نشر Google Play</strong> — تم بناء وإرسال App bundle (.aab) للاختبار المغلق</li>
          <li><strong>SEO والأداء</strong> — تحويل صفحة الهبوط إلى Server-Side Rendering (SSR)</li>
          <li><strong>الترجمة والثيم</strong> — تغطية 100% للديون، خارطة الثراء، الإعدادات</li>
          <li><strong>الأمان المحسن</strong> — تفعيل RLS على جدول app_events</li>
          <li><strong>إعادة هيكلة الإعدادات</strong> — تقسيم إلى الملف الشخصي، الأصول، التفضيلات، الحساب</li>
          <li><strong>إصلاحات بناء أندرويد</strong> — حل مشاكل Gradle</li>
        </ul>
      </div>
      
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.9.0</span>
          <span class="version-date">22 مارس 2026</span>
        </div>
        <ul class="version-features">
          <li><strong>إعادة هيكلة معمارية</strong> — مراجعة شاملة لجميع الشاشات التسع</li>
          <li><strong>مبادرة الكود النظيف</strong> — حل 30+ مشكلة linting</li>
          <li><strong>تدقيق المشروع</strong> — فحص صحي شامل</li>
          <li><strong>APK للإصدار</strong> — تطبيق أندرويد مستقر 55.2 MB</li>
        </ul>
      </div>
      
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.8.0</span>
          <span class="version-date">20 مارس 2026</span>
        </div>
        <ul class="version-features">
          <li><strong>معالجة الأخطاء العالمية</strong> — ErrorHandler مع تسجيل Supabase</li>
          <li><strong>خدمة التحليلات</strong> — تتبع سلوك المستخدم</li>
          <li><strong>تحسين Onboarding</strong> — تدفق PageView متعدد الخطوات</li>
          <li><strong>إصلاح بناء Flutter</strong> — حل جميع أخطاء Dart</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Contributing Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🤝 المساهمة</h2>
      <p>انضم إلينا في بناء مستقبل التمويل العربي</p>
    </div>
    
    <div class="callout callout-info">
      <div class="callout-title">💡 كيف تساهم</div>
      <p>نرحب بالمساهمات! يرجى قراءة إرشادات المساهمة وإرسال pull requests لأي ميزات أو إصلاحات.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <div class="feature-card">
        <span class="feature-icon">🐛</span>
        <h3>الإبلاغ عن الأخطاء</h3>
        <p>وجدت خطأ؟ افتح issue مع خطوات إعادة الإنتاج.</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💡</span>
        <h3>اقتراح ميزات</h3>
        <p>لديك فكرة؟ نحب أن نسمع اقتراحاتك!</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📖</span>
        <h3>تحسين التوثيق</h3>
        <p>ساعدنا في تحسين التوثيق للجميع.</p>
      </div>
    </div>
  </section>
  
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-content">
    <div class="footer-logo">🌅 Fajrak — فجرك</div>
    <p><strong>مبني بـ ❤️ من الأردن للعالم العربي</strong></p>
    <p>© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة</p>
    
    <div class="footer-links">
      <a href="https://github.com/Abdoocoder" target="_blank">👨‍💻 GitHub</a>
      <a href="https://fajrak.com" target="_blank">🌐 الموقع</a>
      <a href="https://fajrak.com/download" target="_blank">📱 التحميل</a>
    </div>
  </div>
</div>
