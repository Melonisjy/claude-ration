<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>别再让 Claude Code 在任务执行到一半时因额度耗尽而突然中断。</strong><br />
    当使用量达到自定义阈值时，自动收尾当前工作并安全暂停 Claude Code 会话。
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
    <a href="./README.md">English</a> | <a href="./README.ko.md">한국어</a> | <strong>简体中文</strong>
  </p>
</div>

---

## 为什么需要 `claude-ration`？

长时间运行 Claude Code 很高效——直到你在重构中途撞上 5 小时或每周额度上限，文件改到一半就被强行中断。

`claude-ration` 是基于 Claude Code hooks 的用量管控工具：
- **提前停下：** 用量超过 `stop` 阈值后，新的提示词和工具调用都会被拦截。
- **Graceful 模式：** 超限后的第一次工具调用仍会放行，让 Claude 完成当前步骤；之后的调用会被拦截。
- **保留余量：** 在 `70%` 停下，剩余额度留给紧急修复（需要时使用 `override`）。
- **实时状态栏：** 以彩色进度条显示 5 小时和每周用量。

```
daily 42% ████░░░░░░ /70%  weekly 18% ██░░░░░░░░ /80%  reset 2h 13m
```

---

## 快速开始 (Quick Start)

```bash
npm install -g claude-ration
claude-ration install
```

然后重启 Claude Code 即可。

> 必须全局安装：hooks 直接调用 `claude-ration` 可执行文件，避免每次工具调用都查询 npm。因此 `npx claude-ration install` 会被拒绝。

`install` 会写入 `~/.claude/settings.local.json`（如果当前项目有 `.claude` 文件夹，也会写入 `./.claude/settings.local.json`）：
- `statusLine` —— **仅在你尚未配置其他状态栏时**（见[使用其他状态栏](#使用其他状态栏)）
- `UserPromptSubmit` 和 `PreToolUse` hooks —— 追加在已有 hooks 之后，原有 hooks 保持不变
- 一个 MCP 服务器，以及斜杠命令 `/ration-status`、`/ration-set`、`/ration-override`

卸载：`claude-ration uninstall`，只会删除 claude-ration 自己添加的条目。

---

## 命令

| 命令 | 说明 |
| :--- | :--- |
| `claude-ration install` | 注册 hooks、状态栏和斜杠命令 |
| `claude-ration uninstall` | 仅删除 claude-ration 的条目 |
| `claude-ration status` | 显示当前用量和阈值 |
| `claude-ration config` | 输出当前配置 |
| `claude-ration config set <key> <0-100>` | 修改阈值，例如 `config set daily.stop 75` |
| `claude-ration override [分钟]` | 临时解除限制（默认 60 分钟） |

在 Claude Code 中：`/ration-status`、`/ration-set daily.stop 75`、`/ration-override 30`。

---

## 配置 (Configuration)

保存在 `~/.claude/ration/config.json`（执行 `config set` 时创建）：

```json
{
  "daily":  { "warn": 60, "stop": 70 },
  "weekly": { "warn": 70, "stop": 80 },
  "graceful": true
}
```

| 键 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `daily.warn` | `60` | 5 小时窗口用量（%）超过此值时状态栏变黄 |
| `daily.stop` | `70` | 5 小时窗口用量（%）超过此值时拦截提示词和工具调用 |
| `weekly.warn` | `70` | 每周用量（%）超过此值时状态栏变黄 |
| `weekly.stop` | `80` | 每周用量（%）超过此值时拦截提示词和工具调用 |
| `graceful` | `true` | 超限后再放行一次工具调用以便收尾。`false` 表示立即拦截（需直接编辑文件） |

> `daily` 指的是 Claude 的 **5 小时**用量窗口，而不是自然日。

---

## 工作原理

1. **状态栏：** Claude Code 每次刷新状态栏时，获取当前 5 小时/每周用量并缓存到 `~/.claude/ration/state.json`。
2. **`UserPromptSubmit` hook：** 超过 `stop` 阈值时拦截新提示词，并显示原因和重置时间。
3. **`PreToolUse` hook：** 超过 `stop` 阈值时，graceful 模式下放行一次工具调用，之后全部拒绝，Claude 随之停止。
4. **Override：** `claude-ration override 30` 临时解除限制 30 分钟。

### 使用其他状态栏

用量数据只在运行 `claude-ration statusline` 时更新。如果你已在使用其他状态栏，`install` 不会覆盖它，只会给出警告——但这样用量不会更新，限制也不会生效。请改为 `"command": "claude-ration statusline"`，或在你自己的状态栏脚本中一并调用。

### 注意事项

- 用量读取自 Claude Code `/usage` 所用的接口，它不是公开 API，可能随时变更。
- 凭据读取自 `~/.claude/.credentials.json`（macOS 上为钥匙串）。仅支持 Claude 订阅（OAuth）登录；使用 API key 时用量始终为 0%。
- 达到限制后斜杠命令也可能被拦截，请在另一个终端运行 `claude-ration override`。

---

## 参与贡献 (Contributing)

欢迎提交 Issue、功能建议或 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 开源协议 (License)

基于 MIT 协议分发。详情请参阅 `LICENSE` 文件。
