<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>Never let Claude Code hit a rate limit mid-task again.</strong><br />
    Automatically wrap up and safely pause your Claude Code sessions when usage reaches your custom threshold.
  </p>
  <p>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/v/claude-ration?color=black&style=flat-square" alt="npm version" />
    </a>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/dm/claude-ration?color=black&style=flat-square" alt="npm downloads" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/npm/l/claude-ration?color=black&style=flat-square" alt="license" />
    </a>
  </p>
  <p>
    <strong>English</strong> | <a href="./README.ko.md">한국어</a>
  </p>
</div>

---

## Why `claude-ration`?

Running long autonomous sessions in Claude Code is powerful—until you suddenly hit a 5-hour session or weekly rate limit right in the middle of refactoring a critical file. Abrupt cutoffs leave broken builds, half-written code, and lost context.

`claude-ration` acts as a smart usage governor:
- **Graceful Shutdown:** Detects when your usage hits a target threshold (e.g., `75%`) and instructs Claude to cleanly finish its current step before stopping.
- **Zero Broken States:** Prevents mid-edit cutoffs so your working tree stays clean and compilable.
- **Emergency Buffer:** Always keep `20–30%` of your quota in reserve for urgent hotfixes or quick questions.
- **Quota Pacing:** Spread your weekly allocation evenly across all 7 days instead of burning out by Tuesday.

---

## Quick Start

### Installation

```bash
npm install -g claude-ration
# or run directly with npx
npx claude-ration
```

### Basic Usage

Start your session with a custom threshold (default: `80%`):

```bash
claude-ration --threshold 75
```

Check your current usage status:

```bash
claude-ration status
```

---

## Configuration

Create a `.claude-ration.json` file in your project root or home directory (`~/.claude-ration.json`) to customize behavior:

```json
{
  "sessionThreshold": 80,
  "weeklyThreshold": 85,
  "gracefulWrapUp": true,
  "notifyOnStop": true
}
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sessionThreshold` | `number` | `80` | Percentage of the 5-hour session limit to trigger a safe stop. |
| `weeklyThreshold` | `number` | `85` | Percentage of the weekly limit to trigger a safe stop. |
| `gracefulWrapUp` | `boolean` | `true` | Allows Claude to finish its current tool call/edit before exiting. |
| `notifyOnStop` | `boolean` | `true` | Sends a terminal/desktop notification when the threshold is reached. |

---

## How It Works

1. **Monitor:** Tracks token consumption and session/weekly quota metrics in real time.
2. **Intercept:** Once usage crosses your defined threshold, `claude-ration` injects a wrap-up signal before the next prompt cycle.
3. **Commit & Pause:** Claude completes its current atomic change, summarizes progress, and exits cleanly.

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the issues page or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -m 'Add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
