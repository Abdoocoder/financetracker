// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

const { ReadableStream, TransformStream } = require('node:stream/web')
const { TextEncoder, TextDecoder } = require('node:util')
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder
try {
    const { Response, Request, Headers } = require('undici')
    if (typeof global.Response === 'undefined') global.Response = Response
    if (typeof global.Request === 'undefined') global.Request = Request
    if (typeof global.Headers === 'undefined') global.Headers = Headers
} catch (e) {
    // ignore
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
}

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
jest.mock('@supabase/supabase-js', () => {
    const createChain = (result = { data: [], error: null }) => {
        const chain = {
            select: jest.fn(() => chain),
            insert: jest.fn(() => chain),
            update: jest.fn(() => chain),
            delete: jest.fn(() => chain),
            eq: jest.fn(() => chain),
            neq: jest.fn(() => chain),
            gt: jest.fn(() => chain),
            gte: jest.fn(() => chain),
            lt: jest.fn(() => chain),
            lte: jest.fn(() => chain),
            like: jest.fn(() => chain),
            ilike: jest.fn(() => chain),
            in: jest.fn(() => chain),
            is: jest.fn(() => chain),
            order: jest.fn(() => chain),
            limit: jest.fn(() => Promise.resolve(result)),
            range: jest.fn(() => Promise.resolve(result)),
            single: jest.fn(() => Promise.resolve(result)),
            maybeSingle: jest.fn(() => Promise.resolve(result)),
            then: (resolve) => Promise.resolve(result).then(resolve),
        }
        return chain
    }
    return {
        createClient: jest.fn(() => ({
            from: jest.fn(() => createChain({ data: [], error: null })),
            auth: {
                getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
                getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
                onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
            },
        })),
    }
})

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
