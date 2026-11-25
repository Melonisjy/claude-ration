// Merge/unmerge claude-ration entries into a Claude Code settings object without touching anyone else's
const MARK = 'claude-ration'

type Json = Record<string, any>
type HookEntry = { hooks?: { command?: string }[] }

const isOurs = (e: HookEntry) => !!e?.hooks?.some(h => h.command?.includes(MARK))

// Appends our hook entries per event (replacing older claude-ration entries, keeping the rest).
// statusLine is only set when empty or already ours; returns `statusLineSkipped` so the caller can warn.
export function addOurs(s: Json, ours: { statusLine?: Json; hooks?: Record<string, HookEntry[]>; mcpServers?: Json }) {
  const out: Json = { ...s }
  let statusLineSkipped = false

  if (ours.statusLine) {
    if (!out.statusLine || out.statusLine.command?.includes(MARK)) out.statusLine = ours.statusLine
    else statusLineSkipped = true
  }

  if (ours.hooks) {
    const h: Json = { ...(out.hooks ?? {}) }
    for (const [event, entries] of Object.entries(ours.hooks)) {
      h[event] = [...(h[event] ?? []).filter((e: HookEntry) => !isOurs(e)), ...entries]
    }
    out.hooks = h
  }

  if (ours.mcpServers) out.mcpServers = { ...(out.mcpServers ?? {}), ...ours.mcpServers }

  return { settings: out, statusLineSkipped }
}

// Removes only what claude-ration added
export function removeOurs(s: Json): Json {
  const out: Json = { ...s }

  if (out.statusLine?.command?.includes(MARK)) delete out.statusLine

  if (out.mcpServers) {
    const m = { ...out.mcpServers }
    delete m[MARK]
    if (Object.keys(m).length) out.mcpServers = m
    else delete out.mcpServers
  }

  if (out.hooks) {
    const h: Json = {}
    for (const [event, entries] of Object.entries(out.hooks)) {
      const kept = Array.isArray(entries) ? entries.filter((e: HookEntry) => !isOurs(e)) : entries
      if (!Array.isArray(kept) || kept.length) h[event] = kept
    }
    if (Object.keys(h).length) out.hooks = h
    else delete out.hooks
  }

  return out
}
