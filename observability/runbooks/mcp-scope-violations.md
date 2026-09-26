# Runbook: MCP Scope Violations Spike

## Alert
**Name:** Fajrak MCP Scope Violations Spike  
**Severity:** Warning  
**Condition:** `rate(mcp_scope_violations_total[5m]) > 1 req/s`

## Diagnosis Steps

1. **Check violations by tool**
   ```promql
   rate(mcp_scope_violations_total[5m]) by tool_name
   ```

2. **Check if specific PAT key is misconfigured**
   - User created PAT with wrong scopes
   - Agent trying to call tool without required scope

3. **Check MCP client configuration**
   - Cursor/Claude Desktop may have stale token

## Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| PAT created without `create_transaction` scope | User must recreate PAT with correct scopes |
| Agent using wrong token | User must update agent config |
| Scope enforcement bug | Check `enforceToolScope` logic |

## Verification
- Scope violations return to baseline (< 0.1/min)