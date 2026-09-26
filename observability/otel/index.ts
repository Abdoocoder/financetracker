/**
 * OpenTelemetry Configuration for Fajrak (Phase 3 Observability).
 *
 * Centralized OTel setup for BYOK Proxy, MCP Server, Crypto operations,
 * and Rate Limiting metrics. Exports to console (dev) or OTLP (prod).
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import type { Span } from '@opentelemetry/api'

const SERVICE_NAME = 'fajrak'
const SERVICE_VERSION = process.env.npm_package_version ?? '3.41.0'
const ENV = process.env.NODE_ENV ?? 'development'
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'
const ENABLE_CONSOLE_EXPORT = ENV !== 'production'

// Custom resource with service metadata
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: ENV,
})

// Trace exporter (OTLP HTTP)
const traceExporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
  headers: {},
})

// Metric exporter (OTLP HTTP) with periodic reader
const metricExporter = new OTLPMetricExporter({
  url: `${OTLP_ENDPOINT}/v1/metrics`,
  headers: {},
})

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 15_000, // 15s export interval
})

// Initialize SDK
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations we don't need
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
    new HttpInstrumentation({
      // Ignore health checks and static assets
      ignoreIncomingRequestHook: (req: any) => {
        const url = req.url ?? ''
        return !url.startsWith('/health') && !url.startsWith('/favicon.ico') && !url.startsWith('/_next/') && !url.startsWith('/api/monitoring')
      },
      requestHook: (span: Span, req: any) => {
        span.setAttribute('http.route', req.route?.path ?? req.url)
      },
    }),
    new ExpressInstrumentation(),
    new PgInstrumentation({
      // Enhanced query attributes
      enhancedDatabaseReporting: true,
    }),
  ],
})

// Start SDK
sdk.start()

// Graceful shutdown
process.on('SIGTERM', async () => {
  await sdk.shutdown()
  process.exit(0)
})

// Export for manual instrumentation
export { sdk }

// Custom metric instruments for Fajrak-specific observability
import { metrics, Meter } from '@opentelemetry/api'

export const fajrakMeter: Meter = metrics.getMeter('fajrak', SERVICE_VERSION)

// --- BYOK Proxy Metrics ---
export const byokProxyRequestsTotal = fajrakMeter.createCounter('byok_proxy_requests_total', {
  description: 'Total BYOK proxy requests',
  unit: '1',
})

export const byokProxyLatencyMs = fajrakMeter.createHistogram('byok_proxy_latency_ms', {
  description: 'BYOK proxy request latency',
  unit: 'ms',
})

export const byokProxyErrorsTotal = fajrakMeter.createCounter('byok_proxy_errors_total', {
  description: 'Total BYOK proxy errors',
  unit: '1',
})

export const byokProxyRateLimitHitsTotal = fajrakMeter.createCounter('byok_proxy_rate_limit_hits_total', {
  description: 'Total BYOK proxy rate limit hits (429)',
  unit: '1',
})

export const byokProxySseStreamsActive = fajrakMeter.createUpDownCounter('byok_proxy_sse_streams_active', {
  description: 'Currently active SSE streams',
  unit: '1',
})

// --- MCP Server Metrics ---
export const mcpToolCallsTotal = fajrakMeter.createCounter('mcp_tool_calls_total', {
  description: 'Total MCP tool calls',
  unit: '1',
})

export const mcpToolLatencyMs = fajrakMeter.createHistogram('mcp_tool_latency_ms', {
  description: 'MCP tool call latency',
  unit: 'ms',
})

export const mcpToolErrorsTotal = fajrakMeter.createCounter('mcp_tool_errors_total', {
  description: 'Total MCP tool errors',
  unit: '1',
})

export const mcpScopeViolationsTotal = fajrakMeter.createCounter('mcp_scope_violations_total', {
  description: 'Total MCP scope violations (403)',
  unit: '1',
})

export const mcpPatAuthFailuresTotal = fajrakMeter.createCounter('mcp_pat_auth_failures_total', {
  description: 'Total MCP PAT authentication failures (401)',
  unit: '1',
})

// --- Crypto Metrics ---
export const cryptoUnwrapFailuresTotal = fajrakMeter.createCounter('crypto_unwrap_failures_total', {
  description: 'Total crypto unwrap failures',
  unit: '1',
})

export const cryptoKeyRotationEventsTotal = fajrakMeter.createCounter('crypto_key_rotation_events_total', {
  description: 'Total key rotation events',
  unit: '1',
})

export const cryptoEnvelopeErrorsTotal = fajrakMeter.createCounter('crypto_envelope_errors_total', {
  description: 'Total envelope encryption/decryption errors',
  unit: '1',
})

// --- Rate Limit Metrics ---
export const rateLimitProxyUsage = fajrakMeter.createHistogram('rate_limit_proxy_usage', {
  description: 'Current proxy usage count per minute window',
  unit: '1',
})

export const rateLimitPatUsage = fajrakMeter.createHistogram('rate_limit_pat_usage', {
  description: 'Current PAT usage count per minute window',
  unit: '1',
})

// --- Helper: Record BYOK Proxy Request ---
export interface ByokProxyMetricLabels {
  providerId: string
  userId: string
  status: 'success' | 'error' | 'rate_limited' | 'unauthorized'
  stream: boolean
}

export function recordByokProxyRequest(labels: ByokProxyMetricLabels, latencyMs: number): void {
  byokProxyRequestsTotal.add(1, {
    provider_id: labels.providerId,
    status: labels.status,
    stream: labels.stream.toString(),
  })
  byokProxyLatencyMs.record(latencyMs, {
    provider_id: labels.providerId,
    status: labels.status,
  })

  if (labels.status === 'rate_limited') {
    byokProxyRateLimitHitsTotal.add(1, { provider_id: labels.providerId })
  }
  if (labels.status === 'error') {
    byokProxyErrorsTotal.add(1, { provider_id: labels.providerId })
  }
}

// --- Helper: Record MCP Tool Call ---
export interface McpToolMetricLabels {
  toolName: string
  userId: string
  status: 'success' | 'error' | 'scope_violation' | 'unauthorized'
}

export function recordMcpToolCall(labels: McpToolMetricLabels, latencyMs: number): void {
  mcpToolCallsTotal.add(1, {
    tool_name: labels.toolName,
    status: labels.status,
  })
  mcpToolLatencyMs.record(latencyMs, { tool_name: labels.toolName })

  if (labels.status === 'scope_violation') {
    mcpScopeViolationsTotal.add(1, { tool_name: labels.toolName })
  }
  if (labels.status === 'unauthorized') {
    mcpPatAuthFailuresTotal.add(1, { tool_name: labels.toolName })
  }
  if (labels.status === 'error') {
    mcpToolErrorsTotal.add(1, { tool_name: labels.toolName })
  }
}

// --- Helper: Record Crypto Operations ---
export function recordCryptoUnwrapFailure(providerId: string, errorType: string): void {
  cryptoUnwrapFailuresTotal.add(1, { provider_id: providerId, error_type: errorType })
}

export function recordKeyRotation(keyId: string, rotatedKeysCount: number): void {
  cryptoKeyRotationEventsTotal.add(1, { key_id: keyId, count: rotatedKeysCount.toString() })
}

// --- Helper: Record Rate Limit ---
export function recordProxyUsage(userId: string, count: number): void {
  rateLimitProxyUsage.record(count, { user_id: userId })
}

export function recordPatUsage(keyId: string, count: number): void {
  rateLimitPatUsage.record(count, { key_id: keyId })
}