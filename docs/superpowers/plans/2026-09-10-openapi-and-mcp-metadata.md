# OpenAPI Spec & MCP Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a machine-readable OpenAPI 3.1 spec for the external-facing API and an MCP server metadata file for client discovery.

**Architecture:** Two static files in `public/` served by Next.js — an OpenAPI spec covering the PAT-authenticated endpoints (webhook, MCP, api-keys) and a `.well-known/mcp.json` for MCP client discovery. No runtime code changes needed.

**Tech Stack:** OpenAPI 3.1, JSON, Next.js static file serving from `public/`

**Spec:** `API_DOCS.md` (root), `docs/technical/api_integration_guide.md`, source code in `app/api/webhook/transaction/route.ts`, `app/api/mcp/route.ts`, `app/api/api-keys/*/route.ts`

## Global Constraints

- OpenAPI version: 3.1.0 (supports JSON Schema 2020-12)
- Only PAT-authenticated (`fjk_live_...`) endpoints are documented — cron endpoints are internal
- Arabic category names must match `types/index.ts` exactly (`'عمل حر'` not `'عملحر'`)
- Files go in `public/` so Next.js serves them at the root URL
- No runtime dependencies — pure static JSON files

---

## File Structure

| File | Purpose |
|------|---------|
| Create: `public/openapi.json` | OpenAPI 3.1 spec for external API |
| Create: `public/.well-known/mcp.json` | MCP server metadata for client discovery |
| Modify: `API_DOCS.md` | Add links to the new machine-readable specs |

---

### Task 1: Generate OpenAPI 3.1 Spec

**Files:**
- Create: `public/openapi.json`

**Interfaces:**
- Consumes: endpoint signatures from `app/api/webhook/transaction/route.ts`, `app/api/mcp/route.ts`, `app/api/api-keys/create/route.ts`, `app/api/api-keys/revoke/route.ts`
- Produces: `public/openapi.json` — machine-readable API spec

- [ ] **Step 1: Create the OpenAPI spec file**

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Fajrak Finance API",
    "description": "External API for AI assistants, bots, and integrations. Authenticate with Personal Access Tokens (PAT) prefixed with `fjk_live_`.",
    "version": "1.1.0",
    "contact": {
      "name": "Fajrak Support",
      "url": "https://fajrak.com"
    }
  },
  "servers": [
    {
      "url": "https://fajrak.com",
      "description": "Production"
    },
    {
      "url": "http://localhost:3000",
      "description": "Local development"
    }
  ],
  "security": [
    {
      "BearerPAT": []
    }
  ],
  "paths": {
    "/api/webhook/transaction": {
      "get": {
        "operationId": "readTransactions",
        "summary": "Read transactions or account balances",
        "description": "Fetch transactions with optional filters, or retrieve account balances. Requires a PAT with the appropriate read scope.",
        "tags": ["Transactions"],
        "parameters": [
          {
            "name": "action",
            "in": "query",
            "description": "Which data to retrieve",
            "schema": {
              "type": "string",
              "enum": ["transactions", "balances"],
              "default": "transactions"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Max number of transactions to return (1-50)",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 50,
              "default": 20
            }
          },
          {
            "name": "offset",
            "in": "query",
            "description": "Pagination offset",
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0
            }
          },
          {
            "name": "type",
            "in": "query",
            "description": "Filter by transaction type",
            "schema": {
              "type": "string",
              "enum": ["income", "expense"]
            }
          },
          {
            "name": "category",
            "in": "query",
            "description": "Filter by exact category name (Arabic)",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "from",
            "in": "query",
            "description": "Start date filter (inclusive, YYYY-MM-DD)",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "to",
            "in": "query",
            "description": "End date filter (inclusive, YYYY-MM-DD)",
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "ok": { "const": true },
                        "transactions": {
                          "type": "array",
                          "items": { "$ref": "#/components/schemas/Transaction" }
                        },
                        "count": { "type": "integer" }
                      }
                    },
                    {
                      "type": "object",
                      "properties": {
                        "ok": { "const": true },
                        "accounts": {
                          "type": "array",
                          "items": { "$ref": "#/components/schemas/AccountBalance" }
                        }
                      }
                    }
                  ]
                }
              }
            },
            "headers": {
              "X-RateLimit-Limit": { "$ref": "#/components/headers/X-RateLimit-Limit" },
              "X-RateLimit-Remaining": { "$ref": "#/components/headers/X-RateLimit-Remaining" },
              "X-RateLimit-Reset": { "$ref": "#/components/headers/X-RateLimit-Reset" }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "403": { "$ref": "#/components/responses/Forbidden" },
          "429": { "$ref": "#/components/responses/RateLimited" },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      },
      "post": {
        "operationId": "createTransaction",
        "summary": "Create a transaction",
        "description": "Create a new income or expense transaction. Requires a PAT with `create_transaction` scope.",
        "tags": ["Transactions"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateTransactionRequest" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Transaction created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ok": { "const": true },
                    "message": { "type": "string" },
                    "transaction": { "$ref": "#/components/schemas/Transaction" }
                  }
                }
              }
            },
            "headers": {
              "X-RateLimit-Limit": { "$ref": "#/components/headers/X-RateLimit-Limit" },
              "X-RateLimit-Remaining": { "$ref": "#/components/headers/X-RateLimit-Remaining" }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "403": { "$ref": "#/components/responses/Forbidden" },
          "413": {
            "description": "Payload too large (max 1024 bytes)",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
              }
            }
          },
          "429": { "$ref": "#/components/responses/RateLimited" },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      }
    },
    "/api/mcp": {
      "get": {
        "operationId": "mcpDiscovery",
        "summary": "MCP server discovery",
        "description": "Returns MCP server metadata. Used by clients to discover available tools.",
        "tags": ["MCP"],
        "responses": {
          "200": {
            "description": "MCP server info",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": { "type": "string", "const": "fajrak" },
                    "version": { "type": "string" },
                    "capabilities": {
                      "type": "object",
                      "properties": {
                        "tools": { "type": "object" }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" }
        }
      },
      "post": {
        "operationId": "mcpToolCall",
        "summary": "Invoke an MCP tool",
        "description": "Execute an MCP tool via JSON-RPC. Supports `tools/list` and `tools/call` methods.",
        "tags": ["MCP"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "description": "JSON-RPC 2.0 request",
                "type": "object",
                "required": ["jsonrpc", "method", "id"],
                "properties": {
                  "jsonrpc": { "const": "2.0" },
                  "method": {
                    "type": "string",
                    "enum": ["initialize", "tools/list", "tools/call"]
                  },
                  "params": {
                    "type": "object",
                    "properties": {
                      "name": { "type": "string", "description": "Tool name (for tools/call)" },
                      "arguments": { "type": "object", "description": "Tool arguments (for tools/call)" }
                    }
                  },
                  "id": { "description": "Request ID" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "JSON-RPC response",
            "content": {
              "application/json": {
                "schema": {
                  "description": "JSON-RPC 2.0 response with MCP tool result"
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "403": {
            "description": "Insufficient scope for requested tool",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": { "const": "insufficient_scope" },
                    "message": { "type": "string" },
                    "required_scope": { "type": "string" },
                    "tool": { "type": "string" }
                  }
                }
              }
            }
          },
          "429": { "$ref": "#/components/responses/RateLimited" },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      }
    },
    "/api/api-keys/create": {
      "post": {
        "operationId": "createApiKey",
        "summary": "Create a PAT",
        "description": "Generate a new Personal Access Token. Requires an active Supabase session.",
        "tags": ["API Keys"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name"],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100,
                    "description": "Human-readable name for this key"
                  },
                  "scopes": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": ["create_transaction", "read_transactions", "read_balances"]
                    },
                    "default": ["create_transaction", "read_transactions", "read_balances"],
                    "description": "Permission scopes for this key"
                  },
                  "rateLimitPerMin": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 10,
                    "description": "Max requests per minute"
                  },
                  "expiresAt": {
                    "type": "string",
                    "format": "date-time",
                    "nullable": true,
                    "default": null,
                    "description": "Expiration timestamp (null = never)"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Key created (full key shown only once)",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string", "format": "uuid" },
                    "name": { "type": "string" },
                    "full_key": {
                      "type": "string",
                      "description": "The PAT — shown only at creation, never retrievable again"
                    },
                    "key_prefix": { "type": "string" },
                    "scopes": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "rate_limit_per_min": { "type": "integer" },
                    "expires_at": { "type": "string", "nullable": true },
                    "created_at": { "type": "string" }
                  }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "409": {
            "description": "Max active keys reached (5 per user)",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
              }
            }
          },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      }
    },
    "/api/api-keys/revoke": {
      "post": {
        "operationId": "revokeApiKey",
        "summary": "Revoke a PAT",
        "description": "Deactivate an API key permanently. Requires an active Supabase session.",
        "tags": ["API Keys"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["key_id"],
                "properties": {
                  "key_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the key to revoke"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Key revoked",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ok": { "const": true }
                  }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "404": {
            "description": "Key not found",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
              }
            }
          },
          "500": { "$ref": "#/components/responses/InternalError" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerPAT": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "fjk_live_...",
        "description": "Personal Access Token. Obtain via Settings > API Keys in the Fajrak app."
      },
      "SessionAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "Cookie",
        "description": "Supabase session cookie (for api-keys endpoints only)"
      }
    },
    "schemas": {
      "Transaction": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "type": { "type": "string", "enum": ["income", "expense"] },
          "amount": { "type": "number", "exclusiveMinimum": 0 },
          "category": { "type": "string", "description": "Arabic category name" },
          "description": { "type": "string", "nullable": true },
          "transaction_date": { "type": "string", "format": "date" },
          "account_id": { "type": "string", "format": "uuid", "nullable": true },
          "created_at": { "type": "string", "format": "date-time" }
        }
      },
      "CreateTransactionRequest": {
        "type": "object",
        "required": ["type", "amount", "category", "transaction_date"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["income", "expense"]
          },
          "amount": {
            "type": "number",
            "exclusiveMinimum": 0,
            "description": "Transaction amount (must be positive)"
          },
          "category": {
            "type": "string",
            "minLength": 1,
            "description": "Must match a valid category for the transaction type",
            "examples": ["مواصلات", "راتب"]
          },
          "description": {
            "type": "string",
            "maxLength": 500,
            "nullable": true,
            "description": "Optional note (HTML stripped, max 500 chars)"
          },
          "transaction_date": {
            "type": "string",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "description": "Date in YYYY-MM-DD format"
          },
          "account_id": {
            "type": "string",
            "format": "uuid",
            "nullable": true,
            "description": "Target account (auto-assigned if omitted)"
          }
        }
      },
      "AccountBalance": {
        "type": "object",
        "properties": {
          "account_name": { "type": "string" },
          "current_balance": { "type": "number" }
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": { "type": "string" },
          "details": {
            "type": "object",
            "description": "Field-level validation errors (for 400 responses)"
          }
        }
      }
    },
    "headers": {
      "X-RateLimit-Limit": {
        "schema": { "type": "integer" },
        "description": "Max requests per window"
      },
      "X-RateLimit-Remaining": {
        "schema": { "type": "integer" },
        "description": "Remaining requests in current window"
      },
      "X-RateLimit-Reset": {
        "schema": { "type": "integer" },
        "description": "Window reset time (Unix seconds)"
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Validation error",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "Unauthorized": {
        "description": "Missing, invalid, or revoked API key",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "Forbidden": {
        "description": "Key lacks required scope",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "message": { "type": "string" }
              }
            }
          }
        }
      },
      "RateLimited": {
        "description": "Rate limit exceeded",
        "headers": {
          "Retry-After": {
            "schema": { "type": "integer" },
            "description": "Seconds until the rate limit resets"
          }
        },
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      },
      "InternalError": {
        "description": "Internal server error",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Validate the OpenAPI spec**

Run: `npx --yes @redocly/cli lint public/openapi.json 2>&1 || true`
Expected: Any warnings are non-blocking (e.g., missing operationId for internal endpoints). Errors indicate a malformed spec that needs fixing.

- [ ] **Step 3: Commit**

```bash
git add public/openapi.json
git commit -m "docs: add OpenAPI 3.1 spec for external API"
```

---

### Task 2: Create MCP Server Metadata

**Files:**
- Create: `public/.well-known/mcp.json`

**Interfaces:**
- Consumes: MCP tool definitions from `app/api/mcp/route.ts`
- Produces: `public/.well-known/mcp.json` — MCP client discovery document

- [ ] **Step 1: Create the MCP metadata file**

```json
{
  "schema": "https://modelcontextprotocol.io/schema/1.0",
  "name": "fajrak",
  "version": "1.0.0",
  "description": "Fajrak Finance MCP Server — AI-powered personal finance tracking with account balances, cash flow summaries, and transaction creation.",
  "repository": "https://github.com/anthropics/fajrak",
  "endpoint": "https://fajrak.com/api/mcp",
  "transport": {
    "type": "streamable-http",
    "protocol": "mcp",
    "auth": {
      "type": "bearer",
      "prefix": "fjk_live_",
      "description": "Personal Access Token from Fajrak Settings > API Keys"
    }
  },
  "tools": [
    {
      "name": "get_balances",
      "description": "Return the current balance of every account belonging to the authenticated user.",
      "requiredScope": "read_balances",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "get_cashflow_summary",
      "description": "Aggregate income and expense totals over an optional date range (inclusive).",
      "requiredScope": "read_transactions",
      "inputSchema": {
        "type": "object",
        "properties": {
          "from": {
            "type": "string",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "description": "Start date (YYYY-MM-DD, inclusive)"
          },
          "to": {
            "type": "string",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
            "description": "End date (YYYY-MM-DD, inclusive)"
          }
        }
      }
    },
    {
      "name": "create_transaction",
      "description": "Create a new income or expense transaction for the authenticated user.",
      "requiredScope": "create_transaction",
      "inputSchema": {
        "type": "object",
        "required": ["type", "amount", "category", "transaction_date"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["income", "expense"]
          },
          "amount": {
            "type": "number",
            "exclusiveMinimum": 0
          },
          "category": {
            "type": "string",
            "minLength": 1,
            "description": "Arabic category name (must match type)"
          },
          "description": {
            "type": "string",
            "maxLength": 500,
            "nullable": true
          },
          "transaction_date": {
            "type": "string",
            "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
          },
          "account_id": {
            "type": "string",
            "format": "uuid",
            "nullable": true
          }
        }
      }
    }
  ],
  "scopes": {
    "read_balances": "View account balances",
    "read_transactions": "Read transaction history and cash flow",
    "create_transaction": "Create new income/expense transactions"
  }
}
```

- [ ] **Step 2: Validate the MCP metadata**

Run: `node -e "const m = require('./public/.well-known/mcp.json'); console.log('Valid MCP metadata:', m.name, 'v' + m.version, '-', m.tools.length, 'tools')"`
Expected: `Valid MCP metadata: fajrak v1.0.0 - 3 tools`

- [ ] **Step 3: Commit**

```bash
git add public/.well-known/mcp.json
git commit -m "docs: add MCP server metadata for client discovery"
```

---

### Task 3: Update API_DOCS.md with Links

**Files:**
- Modify: `API_DOCS.md:145-146`

**Interfaces:**
- Consumes: paths from Tasks 1 and 2
- Produces: updated `API_DOCS.md` with links to machine-readable specs

- [ ] **Step 1: Add links section to API_DOCS.md**

Append before the final note:

```markdown
---

## 📎 مرجع آلي (Machine-Readable References)

| الملف | الوصف | الرابط |
|:------|:------|:-------|
| OpenAPI 3.1 | مواصفة كاملة للـ API (Swagger/Postman compatible) | [openapi.json](https://fajrak.com/openapi.json) |
| MCP Metadata | اكتشاف أدوات MCP للعملاء المدعومة | [/.well-known/mcp.json](https://fajrak.com/.well-known/mcp.json) |
```

- [ ] **Step 2: Commit**

```bash
git add API_DOCS.md
git commit -m "docs: add links to OpenAPI spec and MCP metadata in API_DOCS.md"
```

---

### Task 4: Verify Static Serving

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and verify files are accessible**

Run:
```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/openapi.json | head -c 100
curl -s http://localhost:3000/.well-known/mcp.json | head -c 100
kill %1 2>/dev/null
```

Expected: Both return valid JSON starting with `{` (the file contents).

- [ ] **Step 2: Run build to confirm no issues**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds, both files included in output.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-openapi-and-mcp-metadata.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
