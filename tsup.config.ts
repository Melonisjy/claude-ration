import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    statusline: 'src/statusline.ts',
    'hook-prompt': 'src/hook-prompt.ts',
    'hook-tool': 'src/hook-tool.ts',
    mcp: 'src/mcp.ts',
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})