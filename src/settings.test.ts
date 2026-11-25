import { test, expect } from 'vitest'
import { addOurs, removeOurs } from './settings.js'

const other = { hooks: [{ type: 'command', command: 'my-linter' }] }
const oldOurs = { hooks: [{ type: 'command', command: 'npx -y claude-ration@latest hook-tool' }] }
const newOurs = { hooks: [{ type: 'command', command: 'claude-ration hook-tool' }] }

test('install keeps foreign hooks/statusLine/mcp and replaces old claude-ration entries', () => {
  const before = {
    statusLine: { type: 'command', command: 'claude-hud' },
    hooks: { PreToolUse: [other, oldOurs], Stop: [other] },
    mcpServers: { github: { command: 'gh-mcp' } },
  }
  const { settings, statusLineSkipped } = addOurs(before, {
    statusLine: { type: 'command', command: 'claude-ration statusline' },
    hooks: { PreToolUse: [newOurs] },
    mcpServers: { 'claude-ration': { command: 'claude-ration', args: ['mcp'] } },
  })
  expect(statusLineSkipped).toBe(true)
  expect(settings.statusLine.command).toBe('claude-hud')
  expect(settings.hooks.PreToolUse).toEqual([other, newOurs])
  expect(settings.hooks.Stop).toEqual([other])
  expect(Object.keys(settings.mcpServers)).toEqual(['github', 'claude-ration'])

  const after = removeOurs(settings)
  expect(after).toEqual({ ...before, hooks: { PreToolUse: [other], Stop: [other] } })
})

test('uninstall drops empty containers', () => {
  const { settings } = addOurs({}, {
    statusLine: { type: 'command', command: 'claude-ration statusline' },
    hooks: { PreToolUse: [newOurs] },
    mcpServers: { 'claude-ration': {} },
  })
  expect(removeOurs(settings)).toEqual({})
})
