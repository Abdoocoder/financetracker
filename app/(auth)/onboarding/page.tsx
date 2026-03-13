'use client'
import { useI18n } from '@/lib/i18n'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3
interface Profile { fullName: string; monthlyIncome: string; currency: 'JOD'|'USD'|'SAR'|'AED' }
interface FirstTransaction { type: 'income'|'expense'; amount: string; category: string; description: string }

const CATEGORIES_EXPENSE = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','هدية','أخرى']

function StepDots({ current }: { current: Step }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:32 }}>
      {([1,2,3] as Step[]).map(s => (
        <div key={s} style={{ height:6, width:current===s?24:6, borderRadius:3, background:current===s?'var(--accent-blue)':current>s?'var(--accent-green)':'var(--border)', transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} />
      ))}
    </div>
  )
}

function ProgressBar({ step }: { step: Step }) {
  const pct = ((step-1)/2)*100
  return (
    <div style={{ height:3, background:'var(--border)', borderRadius:2, marginBottom:32, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg, var(--accent-blue), var(--accent-green))', borderRadius:2, transition:'width 0.5s ease' }} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <label style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.15s', ...props.style }} onFocus={e=>{e.currentTarget.style.borderColor='var(--accent-blue)'}} onBlur={e=>{e.currentTarget.style.borderColor='var(--border)'}} />
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-secondary)', color:'var(--text-primary)', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box', cursor:'pointer', ...props.style }} />
}

function Step1({ profile, setProfile, onNext, loading, lang }: { profile:Profile; setProfile:React.Dispatch<React.SetStateAction<Profile>>; onNext:()=>void; loading:boolean; lang:string }) {
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {[80,56,56,56].map((h,i) => <div key={i} className="skeleton" style={{ height:h, borderRadius:12 }} />)}
    </div>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:'var(--accent-blue-dim)', border:'1px solid rgba(59,126,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px' }}>👋</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:'var(--text-primary)', margin:0 }}>{lang === 'en' ? 'Welcome!' : 'أهلاً وسهلاً!'}</h2>
        <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:6 }}>{lang === 'en' ? `Let's finish setting up your account` : 'خلنا نكمّل إعداد حسابك'}</p>
      </div>
      <Field label={lang === "en" ? "Full Name *" : "اسمك الكامل *"}>
        <StyledInput type="text" value={profile.fullName} onChange={e=>setProfile(p=>({...p,fullName:e.target.value}))} placeholder={lang === "en" ? "Full Name" : "اسمك الكامل"} />
      </Field>
      <Field label={lang === "en" ? "Monthly Income (optional)" : "راتبك الشهري (اختياري)"  }>
        <StyledInput type="number" value={profile.monthlyIncome} onChange={e=>setProfile(p=>({...p,monthlyIncome:e.target.value}))} placeholder="0" />
      </Field>
      <Field label="العملة">
        <StyledSelect value={profile.currency} onChange={e=>setProfile(p=>({...p,currency:e.target.value as Profile['currency']}))}>
          <option value="JOD">🇯🇴 دينار أردني (JOD)</option>
          <option value="SAR">🇸🇦 ريال سعودي (SAR)</option>
          <option value="AED">🇦🇪 درهم إماراتي (AED)</option>
          <option value="USD">🇺🇸 دولار أمريكي (USD)</option>
        </StyledSelect>
      </Field>
      <button onClick={onNext} disabled={profile.fullName.trim().length === 0} style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'var(--accent-blue)', color:'white', fontSize:15, fontWeight:700, cursor:profile.fullName.trim()?'pointer':'not-allowed', fontFamily:'inherit', marginTop:8, opacity:profile.fullName.trim()?1:0.5, transition:'opacity 0.15s' }}>
        التالي →
      </button>
    </div>
  )
}

function Step2({ tx, setTx, onNext, onBack, saving, lang }: { tx:FirstTransaction; setTx:React.Dispatch<React.SetStateAction<FirstTransaction>>; onNext:()=>void; onBack:()=>void; saving:boolean; lang:string }) {
  const categories = tx.type==='income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:tx.type==='income'?'var(--accent-green-dim)':'var(--accent-red-dim)', border:`1px solid ${tx.type==='income'?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px', transition:'all 0.3s' }}>{tx.type==='income'?'💰':'💸'}</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:'var(--text-primary)', margin:0 }}>أضف أول معاملة</h2>
        <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:6 }}>خطوة واحدة وتبدأ تشوف سحر التطبيق</p>
      </div>
      <div style={{ display:'flex', gap:8, padding:4, borderRadius:14, background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
        {(['income','expense'] as const).map(type => (
          <button key={type} onClick={()=>setTx(t=>({...t,type,category:''}))} style={{ flex:1, padding:'10px', borderRadius:11, border:'none', background:tx.type===type?(type==='income'?'var(--accent-green)':'var(--accent-red)'):'transparent', color:tx.type===type?'white':'var(--text-muted)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
            {type==='income'?'💰 دخل':'💸 مصروف'}
          </button>
        ))}
      </div>
      <Field label={lang === "en" ? "Amount *" : "المبلغ *"}><StyledInput type="number" value={tx.amount} onChange={e=>setTx(t=>({...t,amount:e.target.value}))} placeholder="0.00" /></Field>
      <Field label="الفئة *">
        <StyledSelect value={tx.category} onChange={e=>setTx(t=>({...t,category:e.target.value}))}>
          <option value="">اختر فئة...</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </StyledSelect>
      </Field>
      <Field label={lang === "en" ? "Description (optional)" : "وصف (اختياري)"  }><StyledInput type="text" value={tx.description} onChange={e=>setTx(t=>({...t,description:e.target.value}))} placeholder={lang === 'en' ? (tx.type==='income' ? 'e.g. March salary' : 'e.g. Electricity bill') : (tx.type==='income' ? 'مثال: راتب شهر مارس' : 'مثال: فاتورة الكهرباء')} /></Field>
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        <button onClick={onBack} style={{ padding:'14px 20px', borderRadius:14, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>← رجوع</button>
        <button onClick={onNext} disabled={saving || tx.amount.length === 0 || tx.category.length === 0} style={{ flex:1, padding:'14px', borderRadius:14, border:'none', background:tx.type==='income'?'var(--accent-green)':'var(--accent-blue)', color:'white', fontSize:15, fontWeight:700, cursor:saving||!tx.amount||!tx.category?'not-allowed':'pointer', fontFamily:'inherit', opacity:saving||!tx.amount||!tx.category?0.5:1, transition:'opacity 0.15s' }}>
          {saving?'⏳ جاري الحفظ...':'حفظ والمتابعة →'}
        </button>
      </div>
      <button onClick={onNext} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', textDecoration:'underline', fontFamily:'inherit', textAlign:'center', padding:'4px' }}>تخطي الآن</button>
    </div>
  )
}

function Step3({ onGo, lang }: { onGo:()=>void; lang:string }) {
  const features = [{ icon:'📊', text:'تتبع دخلك ومصاريفك' },{ icon:'💳', text:'خطة سداد ديونك' },{ icon:'📈', text:'راقب استثماراتك' },{ icon:'🔔', text:'تنبيهات ذكية يومية' }]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ width:72, height:72, borderRadius:22, background:'var(--accent-green-dim)', border:'2px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', animation:'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:'var(--text-primary)', margin:0 }}>جاهز تماماً!</h2>
        <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:6 }}>حسابك أُنشئ بنجاح. إليك ما ينتظرك:</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {features.map((f,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:14, background:'var(--bg-elevated)', border:'1px solid var(--border)', animation:`fadeSlideIn 0.35s ease ${i*0.08}s both` }}>
            <span style={{ fontSize:22 }}>{f.icon}</span>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text-secondary)' }}>{f.text}</span>
            <span style={{ marginRight:'auto', color:'var(--accent-green-light)', fontSize:16 }}>✓</span>
          </div>
        ))}
      </div>
      {/* طلب إذن الإشعارات */}
      <div style={{ padding:'16px', borderRadius:14, background:'rgba(59,126,246,0.06)', border:'1px solid rgba(59,126,246,0.15)', display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:28 }}>🔔</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)', marginBottom:2 }}>
            {lang === 'en' ? 'Enable notifications' : 'فعّل الإشعارات'}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
            {lang === 'en' ? 'Get daily tips and spending alerts' : 'تنبيهات يومية ذكية لمساعدتك'}
          </div>
        </div>
        <button onClick={async () => {
          try {
            if ('Notification' in window) await Notification.requestPermission()
          } catch {}
        }} style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'var(--accent-blue)', color:'white', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
          {lang === 'en' ? 'Allow' : 'السماح'}
        </button>
      </div>

      <button onClick={onGo} style={{ width:'100%', padding:'15px', marginTop:8, borderRadius:14, border:'none', background:'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', color:'white', fontSize:16, fontWeight:900, cursor:'pointer', fontFamily:'inherit', transition:'transform 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.02)'}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)'}}>
        {lang === 'en' ? 'Go to Dashboard 🚀' : 'ادخل لوحة التحكم 🚀'}
      </button>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profile, setProfile] = useState<Profile>({ fullName:'', monthlyIncome:'', currency:'JOD' })
  const [tx, setTx] = useState<FirstTransaction>({ type:'expense', amount:'', category:'', description:'' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingProfile(false); return }
      const meta = user.user_metadata
      const { data } = await supabase.from('profiles').select('full_name,monthly_income,currency').eq('id', user.id).single()
      setProfile({
        fullName: data?.full_name ?? meta?.full_name ?? '',
        monthlyIncome: data?.monthly_income?.toString() ?? meta?.monthly_income?.toString() ?? '',
        currency: (data?.currency ?? 'JOD') as Profile['currency'],
      })
      setLoadingProfile(false)
    }
    load()
  }, [supabase])

  async function handleStep1() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id:user.id, full_name:profile.fullName, monthly_income:profile.monthlyIncome?parseFloat(profile.monthlyIncome):null, currency:profile.currency, onboarding_done:false })
    setStep(2)
  }

  async function handleStep2() {
    if (tx.amount && tx.category) {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('transactions').insert({ user_id:user.id, type:tx.type, amount:parseFloat(tx.amount), category:tx.category, description:tx.description||null, transaction_date:new Date().toISOString().split('T')[0] })
      }
      setSaving(false)
    }
    setStep(3)
  }

  async function handleDone() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').upsert({ id:user.id, onboarding_done:true })
    // طلب إذن الإشعارات
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch {}
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', direction:'rtl' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,126,246,0.08) 0%, transparent 70%)', zIndex:0 }} />
      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'var(--accent-blue)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:18, margin:'0 auto 8px' }}>ف</div>
          <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>الخطوة {step} من 3</span>
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:24, padding:'28px 24px', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}>
          <ProgressBar step={step} />
          <StepDots current={step} />
          {step===1 && <Step1 profile={profile} setProfile={setProfile} onNext={handleStep1} loading={loadingProfile} lang={lang} />}
          {step===2 && <Step2 tx={tx} setTx={setTx} onNext={handleStep2} onBack={()=>setStep(1)} saving={saving} lang={lang} />}
          {step===3 && <Step3 onGo={handleDone} lang={lang} />}
        </div>
      </div>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
