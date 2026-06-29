import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadConfig, saveConfig } from './config.js'
import { loadState } from './state.js'

const server = new McpServer({
  name: 'claude-ration',
  version: '0.1.0',
})

// /ration-status
server.tool('ration_status', 'Show current usage and limits', {}, async () => {
  const state = loadState()
  const config = loadConfig()
  const h = Math.floor(state.reset_in_seconds / 3600)
  const m = Math.floor((state.reset_in_seconds % 3600) / 60)

  return {
    content: [{
      type: 'text',
      text: [
        '🛡️  claude-ration status',
        '',
        `Daily:  ${state.daily_pct.toFixed(1)}%  (warn ${config.daily.warn}% / stop ${config.daily.stop}%)`,
        `Weekly: ${state.weekly_pct.toFixed(1)}%  (warn ${config.weekly.warn}% / stop ${config.weekly.stop}%)`,
        `Resets in: ${h}h ${m}m`,
        `Mode: ${config.graceful ? 'graceful' : 'hard stop'}`,
      ].join('\n')
    }]
  }
})

// /ration-set
server.tool('ration_set', 'Update usage limit threshold', {
  key: z.enum(['daily.warn', 'daily.stop', 'weekly.warn', 'weekly.stop']),
  value: z.number().min(0).max(100),
}, async ({ key, value }) => {
  const config = loadConfig()
  const [section, field] = key.split('.')
  ;(config as any)[section][field] = value
  saveConfig(config)

  return {
    content: [{
      type: 'text',
      text: `✅ ${key} set to ${value}%`
    }]
  }
})

// /ration-override
server.tool('ration_override', 'Temporarily disable limits', {
  minutes: z.number().min(1).max(480).default(60),
}, async ({ minutes }) => {
  const { loadState, saveState } = await import('./state.js')
  const state = loadState()
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  saveState({ ...state, override_until: until })

  return {
    content: [{
      type: 'text',
      text: `✅ Limits disabled for ${minutes} minutes.`
    }]
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

export { main }