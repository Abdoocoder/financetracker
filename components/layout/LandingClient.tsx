'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingClient() {
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 200, 
        background: 'rgba(10,12,18,0.97)', 
        backdropFilter: 'blur(20px)', 
        borderTop: '1px solid rgba(59,126,246,0.2)', 
        padding: '14px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 16, 
        transform: showSticky ? 'translateY(0)' : 'translateY(100%)', 
        transition: 'transform 0.4s ease' 
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>جاهز تتحكم في أموالك؟</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>مجاني تماماً · بدون بطاقة ائتمانية</div>
      </div>
      <Link 
        href="/register" 
        style={{ 
          padding: '12px 28px', 
          borderRadius: 10, 
          background: 'var(--accent-blue)', 
          color: 'white', 
          fontSize: 15, 
          fontWeight: 900, 
          textDecoration: 'none', 
          whiteSpace: 'nowrap', 
          boxShadow: '0 0 20px rgba(59,126,246,0.4)' 
        }}
      >
        ابدأ الآن ←
      </Link>
    </div>
  )
}
