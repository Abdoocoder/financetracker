<style>
/* Fajrak README Modern Styles */
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
  --gradient-card: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
  --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-glow: 0 0 40px rgba(255, 107, 53, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--fajrak-light);
  color: #333;
  line-height: 1.7;
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
  transform: scale(1.1) rotate(5deg);
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
  padding-left: 25px;
  position: relative;
  color: #555;
  transition: color 0.3s ease;
}

.feature-card li::before {
  content: '→';
  position: absolute;
  left: 0;
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
  border-left: 4px solid var(--fajrak-accent);
}

.callout-warning {
  background: linear-gradient(135deg, rgba(255, 179, 71, 0.1) 0%, rgba(255, 179, 71, 0.05) 100%);
  border-left: 4px solid var(--fajrak-secondary);
}

.callout-success {
  background: linear-gradient(135deg, rgba(56, 239, 125, 0.1) 0%, rgba(56, 239, 125, 0.05) 100%);
  border-left: 4px solid #38ef7d;
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

/* Timeline / Roadmap */
.roadmap {
  position: relative;
  padding-left: 40px;
}

.roadmap::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--fajrak-primary), var(--fajrak-accent));
  border-radius: 3px;
}

.roadmap-item {
  position: relative;
  padding: 20px 0;
  padding-left: 30px;
}

.roadmap-item::before {
  content: '';
  position: absolute;
  left: -32px;
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
  text-align: left;
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

.comparison-table .status-partial {
  color: var(--fajrak-secondary);
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
  padding-left: 30px;
  position: relative;
  color: #555;
}

.version-features li::before {
  content: '✨';
  position: absolute;
  left: 0;
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
    <img src="https://fajrak.com/icon-192.png" alt="Fajrak Logo" class="hero-logo" />
    
    <h1>Fajrak — فجرك 🌅</h1>
    <p class="hero-tagline">The First Smart Arabic Personal Finance Manager</p>
    <p class="hero-subtitle">كلنا نحلم بالثراء — هنا تبدأ الرحلة</p>
    
    <div class="nav-pills">
      <a href="https://fajrak.com" class="nav-pill">🌐 Live Demo</a>
      <a href="https://fajrak.com/download" class="nav-pill">📱 Download</a>
      <a href="https://github.com/Abdoocoder/financetracker" class="nav-pill">💻 Source Code</a>
    </div>
    
    <div class="lang-switch">
      <a href="./README.md" class="active">🇬🇧 English</a>
      <a href="./README.ar.md">🇸🇦 العربية</a>
    </div>
  </div>
</div>

<div class="container">
  
  <!-- Vision Section -->
  <section class="section">
    <div class="section-header">
      <h2>✨ Our Vision</h2>
      <p>Empowering financial awareness for every Arab household</p>
    </div>
    
    <div class="callout callout-info">
      <div class="callout-title">🌟 Vision Statement</div>
      <p>Every person should have full awareness of their financial situation and a clear plan for improvement — regardless of income or level — until they achieve <strong>financial freedom</strong>.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(5, 1fr);">
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">🌅</div>
        <div style="font-weight: 600; margin-top: 10px;">Awareness</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">💳</div>
        <div style="font-weight: 600; margin-top: 10px;">Debt Repayment</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">🛡️</div>
        <div style="font-weight: 600; margin-top: 10px;">Emergency Fund</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">📈</div>
        <div style="font-weight: 600; margin-top: 10px;">Investment</div>
      </div>
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 2.5rem;">👑</div>
        <div style="font-weight: 600; margin-top: 10px;">Financial Freedom</div>
      </div>
    </div>
  </section>
  
  <!-- Screenshots Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📸 Screenshots</h2>
      <p>See Fajrak in action</p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px;">
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/welcome.jpeg" alt="Welcome Screen" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">🌅 Welcome</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/login.jpeg" alt="Login Screen" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">🔐 Login</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/regester.jpeg" alt="Register Screen" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">📝 Register</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/settings.jpeg" alt="Settings Screen" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">⚙️ Settings</div>
      </div>
      
      <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: var(--shadow-soft); transition: transform 0.3s ease;">
        <img src="./public/screenshots/more.jpeg" alt="More Features" style="width: 100%; height: auto; display: block;" />
        <div style="padding: 15px; text-align: center; font-weight: 600;">📱 More Features</div>
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(255, 179, 71, 0.05)); border-radius: 15px; padding: 30px; text-align: center;">
      <img src="./public/fajrak_feature_graphic.png" alt="Fajrak Feature Graphic" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: var(--shadow-soft);" />
      <p style="margin-top: 15px; color: #666; font-size: 0.95rem;">📱 Fajrak — Smart Personal Finance Manager</p>
    </div>
  </section>
  
  <!-- Features Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🚀 Core Features</h2>
      <p>Everything you need to master your finances</p>
    </div>
    
    <div class="feature-grid">
      <div class="feature-card">
        <span class="feature-icon">🏠</span>
        <h3>Dashboard</h3>
        <ul>
          <li>Monthly summary: Income, Expenses, Net</li>
          <li>Financial Health Score — full circle 0-100</li>
          <li>Wealth Roadmap — 5 financial stages</li>
          <li>Wealth Simulator — surplus growth calculator</li>
          <li>Saving Challenges — 4 auto-tracked challenges</li>
          <li>Interactive Charts with Recharts + Tooltips</li>
          <li>Quick Add with last transaction repeat</li>
          <li><strong>94% performance boost</strong> with Lazy Loading</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💸</span>
        <h3>Transactions</h3>
        <ul>
          <li>Add / Edit / Delete transactions</li>
          <li>Recurring transactions — monthly auto-execute</li>
          <li>Split into Upcoming and Completed</li>
          <li>Full-text search + Filter by type/month</li>
          <li>Swipe to delete on mobile</li>
          <li>CSV export functionality</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💳</span>
        <h3>Debt Management</h3>
        <ul>
          <li>Visual progress bar tracking</li>
          <li>Auto monthly deduction (CRON)</li>
          <li>Full payment history</li>
          <li>Confetti celebration on repayment</li>
          <li>Debt received as income option</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📊</span>
        <h3>Smart Budgeting</h3>
        <ul>
          <li>Auto summary + AI Advisor</li>
          <li>50/30/20 Rule — automatic allocation</li>
          <li>Manual spending limits per category</li>
          <li>Budget progress tracking</li>
          <li>Spending breakdown visualization</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📈</span>
        <h3>Investments</h3>
        <ul>
          <li>Stocks + 15+ cryptocurrencies</li>
          <li>Live price updates</li>
          <li>Halal investment support</li>
          <li>Wealth Simulator with sliders</li>
          <li>Portfolio summary view</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔔</span>
        <h3>Smart Notifications</h3>
        <ul>
          <li>Firebase FCM for Android</li>
          <li>Web Push for iOS</li>
          <li>Morning, Evening, Weekly reports</li>
          <li>Smart policy: useful only</li>
          <li>Push subscription management</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📖</span>
        <h3>Islamic Daily Lessons</h3>
        <ul>
          <li>Quran verses on provision</li>
          <li>Hadiths on financial ethics</li>
          <li>Daily supplications</li>
          <li>Personalized by financial stage</li>
          <li>25 new scientific lessons</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🎯</span>
        <h3>Gamification</h3>
        <ul>
          <li>Level system based on health score</li>
          <li>Achievement badges</li>
          <li>Lesson streak tracking</li>
          <li>Learning milestones</li>
          <li>Financial challenges</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Mobile Apps Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📱 Mobile Platforms</h2>
      <p>Access Fajrak from any device</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🤖</span>
        <h3>Android</h3>
        <p style="color: #666; margin: 15px 0;">Native Flutter App with full feature parity</p>
        <div style="background: linear-gradient(135deg, #34A853, #4285F4); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ Available on Play Store</div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🌐</span>
        <h3>PWA / TWA</h3>
        <p style="color: #666; margin: 15px 0;">Progressive Web App with APK generation</p>
        <div style="background: var(--gradient-sunset); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ Download APK</div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">🍎</span>
        <h3>iOS</h3>
        <p style="color: #666; margin: 15px 0;">Add to Home Screen PWA experience</p>
        <div style="background: var(--gradient-ocean); color: white; padding: 10px 20px; border-radius: 25px; display: inline-block;">✅ Supported</div>
      </div>
    </div>
  </section>
  
  <!-- Tech Stack Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>⚙️ Technology Stack</h2>
      <p>Built with modern, production-ready technologies</p>
    </div>
    
    <div class="tech-grid">
      <div class="tech-card">
        <div class="tech-icon">⚡</div>
        <h4>Next.js 15</h4>
        <p>React framework with App Router, SSR, and edge runtime</p>
        <span class="tech-badge">Framework</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔷</div>
        <h4>TypeScript</h4>
        <p>Full type safety with strict mode enabled</p>
        <span class="tech-badge">Language</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🗄️</div>
        <h4>Supabase</h4>
        <p>PostgreSQL database, Auth, and Row Level Security</p>
        <span class="tech-badge">Backend</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🔥</div>
        <h4>Firebase</h4>
        <p>Cloud Messaging for push notifications (FCM)</p>
        <span class="tech-badge">Notifications</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">📱</div>
        <h4>Flutter 3.x</h4>
        <p>Native Android app with complete feature parity</p>
        <span class="tech-badge">Mobile</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">🚀</div>
        <h4>Vercel</h4>
        <p>Serverless deployment with edge functions</p>
        <span class="tech-badge">Hosting</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">📊</div>
        <h4>Recharts</h4>
        <p>Interactive charts and data visualization</p>
        <span class="tech-badge">Charts</span>
      </div>
      
      <div class="tech-card">
        <div class="tech-icon">⏰</div>
        <h4>cron-job.org</h4>
        <p>Scheduled automation (Amman UTC+3)</p>
        <span class="tech-badge">Automation</span>
      </div>
    </div>
  </section>
  
  <!-- Database Schema Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🗄️ Database Architecture</h2>
      <p>Comprehensive data model with RLS protection</p>
    </div>
    
    <div class="callout callout-success">
      <div class="callout-title">🔒 Security First</div>
      <p>All tables are protected with <strong>Row Level Security (RLS)</strong>, ensuring users can only access their own data.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>📋 Core Tables</h4>
        <ul style="text-align: left; margin-top: 15px;">
          <li>profiles</li>
          <li>transactions</li>
          <li>debts</li>
          <li>debt_payments</li>
        </ul>
      </div>
      
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>💰 Financial</h4>
        <ul style="text-align: left; margin-top: 15px;">
          <li>investments</li>
          <li>investment_transactions</li>
          <li>budgets</li>
          <li>savings_goals</li>
        </ul>
      </div>
      
      <div class="feature-card" style="text-align: center; padding: 25px;">
        <h4>🔔 System</h4>
        <ul style="text-align: left; margin-top: 15px;">
          <li>alerts</li>
          <li>push_subscriptions</li>
          <li>user_stats</li>
          <li>testimonials</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Automation Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>⏰ Automated Workflows</h2>
      <p>Smart automation running on cron-job.org (UTC+3 Amman timezone)</p>
    </div>
    
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Task</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>6:00 AM</strong></td>
          <td>Morning reminders + smart alerts</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
        <tr>
          <td><strong>8:00 AM</strong></td>
          <td>Auto salary detection (silent)</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
        <tr>
          <td><strong>9:00 AM</strong></td>
          <td>Auto debt deduction (silent)</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
        <tr>
          <td><strong>6:00 PM</strong></td>
          <td>Evening reminder (if needed)</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
        <tr>
          <td><strong>7:00 PM</strong></td>
          <td>Daily wealth tip</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
        <tr>
          <td><strong>Friday</strong></td>
          <td>Weekly comparison report</td>
          <td><span class="status-yes">Active</span></td>
        </tr>
      </tbody>
    </table>
  </section>
  
  <!-- Quick Start Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🚀 Quick Start</h2>
      <p>Get up and running in under 5 minutes</p>
    </div>
    
    <div class="quickstart">
      <h3>📦 Installation</h3>
      
      <div class="code-block">
        <code>
          <span class="comment"># Clone the repository</span><br/>
          <span class="command">git clone</span> https://github.com/Abdoocoder/financetracker.git<br/><br/>
          <span class="comment"># Navigate to project directory</span><br/>
          <span class="command">cd</span> financetracker<br/><br/>
          <span class="comment"># Install dependencies</span><br/>
          <span class="command">npm install</span><br/><br/>
          <span class="comment"># Copy environment template</span><br/>
          <span class="command">cp</span> .env.local.example .env.local<br/><br/>
          <span class="comment"># Start development server</span><br/>
          <span class="command">npm run dev</span>
        </code>
      </div>
      
      <div class="callout callout-warning">
        <div class="callout-title">⚠️ Environment Setup</div>
        <p>Configure your <code>.env.local</code> with Supabase and Firebase credentials before running.</p>
      </div>
    </div>
  </section>
  
  <!-- Testing Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🧪 Testing</h2>
      <p>Comprehensive test suite with Jest</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">✅</span>
        <h3>Run Tests</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px;">
          <code><span class="command">npm test</span></code>
        </div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">👀</span>
        <h3>Watch Mode</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px;">
          <code><span class="command">npm run test:watch</span></code>
        </div>
      </div>
      
      <div class="feature-card" style="text-align: center;">
        <span class="feature-icon">📊</span>
        <h3>Coverage</h3>
        <div class="code-block" style="background: #1a1a2e; margin-top: 15px;">
          <code><span class="command">npm run test:coverage</span></code>
        </div>
      </div>
    </div>
    
    <div class="callout callout-info" style="margin-top: 30px;">
      <div class="callout-title">📈 Coverage Stats</div>
      <p><strong>lib/cache.ts:</strong> 83.33% | <strong>types/index.ts:</strong> 100% | <strong>lib/currency.ts:</strong> 30.76%</p>
    </div>
  </section>
  
  <!-- Security Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🔐 Security Features</h2>
      <p>Enterprise-grade security measures</p>
    </div>
    
    <div class="security-grid">
      <div class="security-item">
        <div class="security-icon">🛡️</div>
        <h4>Row Level Security</h4>
        <p>Database-level access control</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔑</div>
        <h4>Middleware Auth</h4>
        <p>Protected dashboard routes</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔒</div>
        <h4>CRON Secret</h4>
        <p>API endpoint protection</p>
      </div>
      
      <div class="security-item">
        <div class="security-icon">🔥</div>
        <h4>Firebase Admin</h4>
        <p>Secure push notifications</p>
      </div>
    </div>
  </section>
  
  <!-- Roadmap Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🗺️ Roadmap</h2>
      <p>Planned features and improvements</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: 1fr 1fr;">
      <div>
        <h3 style="color: #38ef7d; margin-bottom: 20px;">✅ Completed</h3>
        <div class="roadmap">
          <div class="roadmap-item completed">
            <h4>Auth + Onboarding + PWA</h4>
            <p>Complete authentication flow with progressive web app</p>
          </div>
          <div class="roadmap-item completed">
            <h4>Transactions + Debts + Investments</h4>
            <p>Full financial management suite</p>
          </div>
          <div class="roadmap-item completed">
            <h4>Smart Notifications (iOS + Android FCM)</h4>
            <p>Cross-platform push notifications</p>
          </div>
          <div class="roadmap-item completed">
            <h4>Budget + Financial Health</h4>
            <p>Budget tracking and wealth roadmap</p>
          </div>
          <div class="roadmap-item completed">
            <h4>Gamification + Islamic Lessons</h4>
            <p>Educational content and achievements</p>
          </div>
          <div class="roadmap-item completed">
            <h4>Native Flutter Android App</h4>
            <p>54.5 MB Release APK on Google Play</p>
          </div>
          <div class="roadmap-item completed">
            <h4>fajrak.com Custom Domain</h4>
            <p>Production deployment with SSL</p>
          </div>
        </div>
      </div>
      
      <div>
        <h3 style="color: var(--fajrak-primary); margin-bottom: 20px;">📋 In Progress</h3>
        <div class="roadmap">
          <div class="roadmap-item">
            <h4>Monthly PDF Reports</h4>
            <p>Generate downloadable financial summaries</p>
          </div>
          <div class="roadmap-item">
            <h4>Subscription System (Paddle)</h4>
            <p>Premium features with payment processing</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Changelog Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>📝 Changelog</h2>
      <p>Recent updates and improvements</p>
    </div>
    
    <div class="changelog">
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.10.0</span>
          <span class="version-date">March 23, 2026</span>
          <span style="background: var(--gradient-emerald); color: white; padding: 3px 10px; border-radius: 10px; font-size: 0.75rem;">Latest</span>
        </div>
        <ul class="version-features">
          <li><strong>Google Play Publishing</strong> — App bundle (.aab) successfully built and submitted for closed testing</li>
          <li><strong>SEO & Performance</strong> — Converted Next.js landing page to Server-Side Rendering (SSR)</li>
          <li><strong>Localization & Theming</strong> — 100% translation coverage for Debt, Roadmap, and Settings</li>
          <li><strong>Enhanced Security</strong> — Enabled RLS on public.app_events telemetry table</li>
          <li><strong>Settings Refactoring</strong> — Modularized into Profile, Assets, Preferences, Account</li>
          <li><strong>Android Build Fixes</strong> — Resolved Gradle evaluation issues</li>
        </ul>
      </div>
      
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.9.0</span>
          <span class="version-date">March 22, 2026</span>
        </div>
        <ul class="version-features">
          <li><strong>Modular Architecture Refactoring</strong> — Full overhaul of all 9 major screens</li>
          <li><strong>Clean Code Initiative</strong> — Resolved 30+ linting issues</li>
          <li><strong>Full Project Audit</strong> — Comprehensive health check completed</li>
          <li><strong>Release APK</strong> — Stable 55.2 MB Android APK</li>
        </ul>
      </div>
      
      <div class="version">
        <div class="version-header">
          <span class="version-number">v3.8.0</span>
          <span class="version-date">March 20, 2026</span>
        </div>
        <ul class="version-features">
          <li><strong>Global Error Handling</strong> — ErrorHandler utility with Supabase logging</li>
          <li><strong>Analytics Service</strong> — user behavior tracking to app_events</li>
          <li><strong>Improved Onboarding</strong> — Multi-step PageView flow</li>
          <li><strong>Flutter Build Fixed</strong> — All Dart syntax errors resolved</li>
        </ul>
      </div>
    </div>
  </section>
  
  <!-- Contributing Section -->
  <section class="section" style="margin-top: 60px;">
    <div class="section-header">
      <h2>🤝 Contributing</h2>
      <p>Join us in building the future of Arabic finance</p>
    </div>
    
    <div class="callout callout-info">
      <div class="callout-title">💡 How to Contribute</div>
      <p>We welcome contributions! Please read our contributing guidelines and submit pull requests for any features or bug fixes.</p>
    </div>
    
    <div class="feature-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <div class="feature-card">
        <span class="feature-icon">🐛</span>
        <h3>Report Bugs</h3>
        <p>Found a bug? Open an issue with detailed reproduction steps.</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">💡</span>
        <h3>Suggest Features</h3>
        <p>Have an idea? We'd love to hear your suggestions!</p>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📖</span>
        <h3>Improve Documentation</h3>
        <p>Help us make the docs better for everyone.</p>
      </div>
    </div>
  </section>
  
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-content">
    <div class="footer-logo">🌅 Fajrak — فجرك</div>
    <p><strong>Built with ❤️ from Jordan for the Arab world</strong></p>
    <p>© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة</p>
    
    <div class="footer-links">
      <a href="https://github.com/Abdoocoder" target="_blank">👨‍💻 GitHub</a>
      <a href="https://fajrak.com" target="_blank">🌐 Website</a>
      <a href="https://fajrak.com/download" target="_blank">📱 Download</a>
    </div>
  </div>
</div>
