'use client'
import React from 'react'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

export function DashboardEmptyState() {
  const { lang } = useI18n()

  return (
    <div style={{
      padding: '32px 24px', borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(59,126,246,0.06) 0%, rgba(139,92,246,0.04) 100%)',
      border: '1px solid rgba(59,126,246,0.15)',
      textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌅</div>

      <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
        {lang === 'ar' ? 'رحلتك تبدأ الآن' : 'Your Journey Starts Now'}
      </h2>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24, maxWidth: 280, margin: '0 auto 24px' }}>
        {lang === 'ar'
          ? 'سجّل أول معاملة لك وابدأ رحلة الوعي المالي. كل دينار تسجله هو خطوة نحو حريتك المالية.'
          : 'Log your first transaction and start your financial awareness journey. Every dinar you track is a step toward financial freedom.'}
      </p>

      {/* خطوات البداية */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: lang === 'ar' ? 'right' : 'left' }}>
        {[
          { num: '1', ar: 'أضف راتبك أو دخلك الشهري', en: 'Add your monthly salary or income', href: '/dashboard/transactions', color: '#10B981' },
          { num: '2', ar: 'سجّل مصاريفك اليومية', en: 'Log your daily expenses', href: '/dashboard/transactions', color: '#3B7EF6' },
          { num: '3', ar: 'حدد هدفاً مالياً واحداً', en: 'Set one financial goal', href: '/dashboard/goals', color: '#8B5CF6' },
        ].map((step, i) => (
          <Link key={i} href={step.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `${step.color}20`, border: `1px solid ${step.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: step.color,
              }}>{step.num}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {step[lang as 'ar' | 'en']}
              </span>
              <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>←</span>
            </div>
          </Link>
        ))}
      </div>

      {/* زر البداية */}
      <Link href="/dashboard/transactions" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 28px', borderRadius: 14,
        background: 'var(--accent-blue)', color: 'white',
        fontSize: 14, fontWeight: 900, textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(59,126,246,0.3)',
      }}>
        ⚡ {lang === 'ar' ? 'سجّل أول معاملة' : 'Log First Transaction'}
      </Link>

      {/* اقتباس تحفيزي */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
        <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 800, marginBottom: 4 }}>🕌</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
          {lang === 'ar'
            ? '"ما أنفقت من نفقة فإنها صدقة" — صحيح البخاري'
            : '"Every spending in goodness is charity" — Sahih Bukhari'}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle, action }: { icon: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
