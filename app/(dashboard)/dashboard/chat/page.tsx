'use client'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'

const ChatAssistant = dynamic(() => import('@/components/dashboard/chat-assistant'), {
    loading: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 64, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 56, borderRadius: 16 }} />
        </div>
    ),
})

export default function ChatPage() {
    const { t } = useI18n()
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PageHeader title={t('chat_title')} subtitle={t('chat_subtitle')} />
            <ChatAssistant />
        </div>
    )
}