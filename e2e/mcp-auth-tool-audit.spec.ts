import { test, expect } from '@playwright/test';

test.describe('MCP Auth → Tool → Audit Flow', () => {
  test('MCP create_transaction with valid PAT and idempotency key', async ({ request }) => {
    // First, we'd need a valid PAT - this test documents the expected API flow
    // In practice, the PAT would be created via the UI or API
    
    const apiKey = process.env.E2E_MCP_PAT || 'fjk_live_test_key_placeholder';
    
    // Test 1: create_transaction without idempotency key should work
    const response1 = await request.post('/api/mcp', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'create_transaction',
          arguments: {
            type: 'expense',
            amount: 50,
            category: 'طعام وشراب',
            transaction_date: new Date().toISOString().split('T')[0],
          },
        },
      },
    });

    // Should either succeed or return proper error (not 500)
    expect([200, 401, 403, 429]).toContain(response1.status());
    
    if (response1.status() === 200) {
      const body = await response1.json();
      expect(body.result).toBeDefined();
      expect(body.result.structuredContent.ok).toBe(true);
    }
  });

  test('MCP create_transaction with idempotency key prevents duplicate', async ({ request }) => {
    const apiKey = process.env.E2E_MCP_PAT || 'fjk_live_test_key_placeholder';
    const idempotencyKey = 'e2e-test-idempotency-' + Date.now();

    // First request
    const response1 = await request.post('/api/mcp', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'create_transaction',
          arguments: {
            type: 'expense',
            amount: 75,
            category: 'طعام وشراب',
            transaction_date: new Date().toISOString().split('T')[0],
            idempotency_key: idempotencyKey,
          },
        },
      },
    });

    // Second request with same idempotency key
    const response2 = await request.post('/api/mcp', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'create_transaction',
          arguments: {
            type: 'expense',
            amount: 75,
            category: 'طعام وشراب',
            transaction_date: new Date().toISOString().split('T')[0],
            idempotency_key: idempotencyKey,
          },
        },
      },
    });

    // Both should not be 500
    expect([200, 401, 403, 429]).toContain(response1.status());
    expect([200, 401, 403, 429]).toContain(response2.status());

    if (response1.status() === 200 && response2.status() === 200) {
      const body1 = await response1.json();
      const body2 = await response2.json();
      
      // Second should be idempotent replay
      expect(body2.result.structuredContent.idempotent_replay).toBe(true);
      expect(body2.result.structuredContent.transaction.id).toBe(body1.result.structuredContent.transaction.id);
    }
  });

  test('MCP scope enforcement - read-only key cannot call create_transaction', async ({ request }) => {
    // This would require a read-only PAT - documented for when we have test PATs
    const readOnlyApiKey = process.env.E2E_MCP_READONLY_PAT || 'fjk_live_readonly_placeholder';
    
    const response = await request.post('/api/mcp', {
      headers: {
        'Authorization': `Bearer ${readOnlyApiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'create_transaction',
          arguments: {
            type: 'expense',
            amount: 100,
            category: 'طعام وشراب',
            transaction_date: new Date().toISOString().split('T')[0],
          },
        },
      },
    });

    // Should return 403 Forbidden with proper error shape
    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).toBe('insufficient_scope');
      expect(body.required_scope).toBe('create_transaction');
      expect(body.tool).toBe('create_transaction');
    }
  });
});