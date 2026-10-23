/**
 * @jest-environment node
 *
 * Agent loop (Phase 2) — model → tool → result → model, bounded.
 *
 * Policy under test:
 *   - read tools run immediately through the injected executor
 *   - write / confirmation-gated tools NEVER run on the model's say-so; the
 *     loop pauses with a `confirmation_required` result instead
 *   - an explicit confirmation runs the tool with `confirmed: true`, then the
 *     model finishes the turn
 *   - the loop is bounded (default 3 model turns)
 */
import { AgentLoopError, runAgentLoop } from '@/lib/agent/loop'
import type { AgentTool } from '@/lib/agent/tools'
import type { AgentMessage, ModelTurn } from '@/lib/agent/providers'
import { z } from 'zod'

const readTool = {
  name: 'get_spending_breakdown',
  description: 'spending',
  kind: 'read',
  scope: 'read_transactions',
  requiresConfirmation: false,
  parameters: { type: 'object', properties: {}, additionalProperties: false },
  schema: z.strictObject({ month: z.number().int().min(1).max(12) }),
  execute: jest.fn(),
} as unknown as AgentTool

const writeTool = {
  name: 'create_transaction',
  description: 'create',
  kind: 'write',
  scope: 'create_transaction',
  requiresConfirmation: true,
  parameters: { type: 'object', properties: {}, additionalProperties: false },
  schema: z.strictObject({ amount: z.number().positive(), category: z.string() }),
  execute: jest.fn(),
} as unknown as AgentTool

const TOOLS: Record<string, AgentTool> = {
  [readTool.name]: readTool,
  [writeTool.name]: writeTool,
}

function getTool(name: string) {
  return TOOLS[name]
}

function toolCall(name: string, args: unknown, id = 'call_1') {
  return { id, name, arguments: JSON.stringify(args) }
}

const USER: AgentMessage[] = [{ role: 'user', content: 'How much did I spend?' }]

describe('runAgentLoop — read tools', () => {
  it('executes the tool, feeds the result back, and returns the final text', async () => {
    const executeTool = jest.fn(async () => ({ total: 10 }))
    const callModel = jest.fn()
      .mockResolvedValueOnce({
        text: 'Let me check.',
        toolCalls: [toolCall('get_spending_breakdown', { month: 10 })],
      })
      .mockResolvedValueOnce({ text: 'You spent 10.', toolCalls: [] })

    const traces: Array<[string, string]> = []
    const result = await runAgentLoop({
      messages: USER,
      callModel,
      executeTool,
      getTool,
      events: { onTrace: (tool, status) => traces.push([tool, status]) },
    })

    expect(result.type).toBe('completed')
    if (result.type !== 'completed') throw new Error('unreachable')
    expect(result.text).toBe('You spent 10.')
    expect(callModel).toHaveBeenCalledTimes(2)
    expect(executeTool).toHaveBeenCalledWith(
      'get_spending_breakdown',
      { month: 10 },
      expect.objectContaining({ id: 'call_1' }),
      false
    )
    // The second model call must see the tool result, not just the user text.
    const history = callModel.mock.calls[1][0]
    expect(history).toEqual([
      ...USER,
      expect.objectContaining({ role: 'assistant', content: 'Let me check.' }),
      {
        role: 'tool',
        toolCallId: 'call_1',
        name: 'get_spending_breakdown',
        content: '{"total":10}',
      },
    ])
    expect(traces).toEqual([
      ['get_spending_breakdown', 'running'],
      ['get_spending_breakdown', 'done'],
    ])
  })

  it('streams model text through events.onText', async () => {
    const seen: string[] = []
    const callModel = jest.fn()
      .mockImplementationOnce(async (_messages, onText) => {
        onText('Hel')
        onText('lo')
        return { text: 'Hello', toolCalls: [] }
      })

    await runAgentLoop({
      messages: USER,
      callModel,
      executeTool: jest.fn(),
      getTool,
      events: { onText: (t) => seen.push(t) },
    })

    expect(seen).toEqual(['Hel', 'lo'])
  })
})

describe('runAgentLoop — write tools', () => {
  it('pauses with confirmation_required and never executes the write', async () => {
    const executeTool = jest.fn()
    const callModel = jest.fn()
      .mockResolvedValue({
        text: 'Add 50 KWD for food?',
        toolCalls: [toolCall('create_transaction', { amount: 50, category: 'food' })],
      })

    const result = await runAgentLoop({
      messages: USER,
      callModel,
      executeTool,
      getTool,
    })

    expect(result).toEqual({
      type: 'confirmation_required',
      tool: 'create_transaction',
      args: { amount: 50, category: 'food' },
      toolCall: expect.objectContaining({ id: 'call_1' }),
      text: 'Add 50 KWD for food?',
      messages: expect.any(Array),
    })
    expect(executeTool).not.toHaveBeenCalled()
  })

  it('executes an explicitly confirmed write with confirmed: true and finishes the turn', async () => {
    const executeTool = jest.fn(async () => ({ ok: true, transaction: { id: 'tx1' } }))
    const callModel = jest.fn()
      .mockResolvedValue({ text: 'Done — recorded.', toolCalls: [] })

    const result = await runAgentLoop({
      messages: [
        ...USER,
        { role: 'assistant', content: 'Add 50 KWD for food?' },
      ],
      callModel,
      executeTool,
      getTool,
      confirmation: { tool: 'create_transaction', args: { amount: 50, category: 'food' } },
    })

    expect(executeTool).toHaveBeenCalledWith(
      'create_transaction',
      { amount: 50, category: 'food' },
      expect.objectContaining({ name: 'create_transaction' }),
      true
    )
    expect(result.type).toBe('completed')
    if (result.type !== 'completed') throw new Error('unreachable')
    expect(result.text).toBe('Done — recorded.')
    const history = callModel.mock.calls[0][0]
    expect(history[history.length - 1]).toEqual({
      role: 'tool',
      toolCallId: expect.any(String),
      name: 'create_transaction',
      content: '{"ok":true,"transaction":{"id":"tx1"}}',
    })
  })

  it('rejects a confirmation for a tool that does not require one', async () => {
    await expect(
      runAgentLoop({
        messages: USER,
        callModel: jest.fn(),
        executeTool: jest.fn(),
        getTool,
        confirmation: { tool: 'get_spending_breakdown', args: { month: 10 } },
      })
    ).rejects.toMatchObject({ code: 'invalid_confirmation' })
  })

  it('rejects confirmation args that fail the tool schema', async () => {
    await expect(
      runAgentLoop({
        messages: USER,
        callModel: jest.fn(),
        executeTool: jest.fn(),
        getTool,
        confirmation: { tool: 'create_transaction', args: { amount: -1, category: 'food' } },
      })
    ).rejects.toMatchObject({ code: 'invalid_args' })
  })
})

describe('runAgentLoop — bounds and resilience', () => {
  it('stops after 3 model turns when the model keeps calling tools', async () => {
    const callModel = jest.fn()
      .mockResolvedValue({
        text: '',
        toolCalls: [toolCall('get_spending_breakdown', { month: 10 })],
      })
    const executeTool = jest.fn(async () => ({ total: 10 }))

    await expect(
      runAgentLoop({ messages: USER, callModel, executeTool, getTool })
    ).rejects.toBeInstanceOf(AgentLoopError)

    await expect(
      runAgentLoop({ messages: USER, callModel, executeTool, getTool })
    ).rejects.toMatchObject({ code: 'iteration_limit' })
    expect(callModel).toHaveBeenCalledTimes(6)
  })

  it('feeds an unknown tool back to the model instead of executing anything', async () => {
    const executeTool = jest.fn()
    const callModel = jest.fn()
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [toolCall('drop_database', {})],
      })
      .mockResolvedValueOnce({ text: 'I could not do that.', toolCalls: [] })

    const result = await runAgentLoop({ messages: USER, callModel, executeTool, getTool })

    expect(result.type).toBe('completed')
    expect(executeTool).not.toHaveBeenCalled()
    const history = callModel.mock.calls[1][0]
    expect(history[history.length - 1]).toEqual(
      expect.objectContaining({
        role: 'tool',
        name: 'drop_database',
        content: expect.stringContaining('Unknown tool'),
      })
    )
  })

  it('feeds invalid tool arguments back to the model instead of executing', async () => {
    const executeTool = jest.fn()
    const callModel = jest.fn()
      .mockResolvedValueOnce({
        text: '',
        toolCalls: [toolCall('get_spending_breakdown', { month: 99 })],
      })
      .mockResolvedValueOnce({ text: 'Try again with a valid month.', toolCalls: [] })

    const result = await runAgentLoop({ messages: USER, callModel, executeTool, getTool })

    expect(result.type).toBe('completed')
    expect(executeTool).not.toHaveBeenCalled()
    const history = callModel.mock.calls[1][0]
    expect(history[history.length - 1]).toEqual(
      expect.objectContaining({
        role: 'tool',
        name: 'get_spending_breakdown',
        content: expect.stringContaining('Invalid arguments'),
      })
    )
  })
})
