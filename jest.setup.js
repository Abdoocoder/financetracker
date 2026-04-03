// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock window.matchMedia
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    })
}

// Mock sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        refresh: jest.fn(),
        back: jest.fn(),
        prefetch: jest.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                        limit: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
                    })),
                    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                    limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
            update: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            delete: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
        })),
        auth: {
            getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        },
    })),
}))

// Mock Firebase Admin
const mockMessagingSend = jest.fn(() => Promise.resolve('mock-message-id'))
const mockMessaging = { send: mockMessagingSend }

jest.mock('firebase-admin/app', () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    cert: jest.fn(),
}))

jest.mock('firebase-admin/messaging', () => ({
    getMessaging: jest.fn(() => mockMessaging),
}))

// Mock Web Push
jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(() => Promise.resolve()),
}))
