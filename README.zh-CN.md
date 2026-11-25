<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>别再让 Claude Code 在任务执行到一半时因额度耗尽而突然中断。</strong><br />
    当使用量达到自定义阈值时，自动收尾当前工作并安全暂停 Claude Code 会话。
  </p>
  <p>
    <a href="https://npmjs.com">
      <img src="https://shields.io" alt="npm version" />
    </a>
    <a href="https://npmjs.com">
      <img src="https://shields.io" alt="npm downloads" />
    </a>
    <a href="./LICENSE">
      <img src="https://shields.io" alt="license" />
    </a>
  </p>
  <p>
    <a href="./README.md">English</a> | <a href="./README.ko.md">한국어</a> | <strong>简体中文</strong>
  </p>
</div>

---

## 为什么需要 `claude-ration`？

让 Claude Code 长时间自动运行非常高效——直到它在重构关键文件的中途突然触发 5 小时会话限制或每周额度上限。强制中断往往会导致代码损坏、构建失败以及上下文丢失。

`claude-ration` 充当智能额度管家：
- **优雅停机 (Graceful Shutdown)：** 当使用量达到目标阈值（例如 `75%`）时，不会立即强制终止，而是让 Claude 完整收尾当前步骤后再停止。
- **杜绝代码损坏：** 避免在文件修改一半时中断，确保工作区代码始终干净且可编译。
- **紧急备用额度：** 始终预留 `20–30%` 的额度，以应对紧急线上修复（Hotfix）或临时提问。
- **额度合理分配：** 将每周总配额均匀分配到 7 天，避免周二就把一周的额度全部耗尽。

---

## 快速开始 (Quick Start)

### 安装

```bash
npm install -g claude-ration
# 或直接使用 npx 运行
npx claude-ration
```

### 基本用法

指定自定义阈值启动会话（默认：`80%`）：

```bash
claude-ration --threshold 75
```

查看当前额度使用状态：

```bash
claude-ration status
```

---

## 配置 (Configuration)

在项目根目录或用户主目录（`~/.claude-ration.json`）创建配置文件以自定义行为：

```json
{
  "sessionThreshold": 80,
  "weeklyThreshold": 85,
  "gracefulWrapUp": true,
  "notifyOnStop": true
}
```

| 选项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `sessionThreshold` | `number` | `80` | 触发安全停止的 5 小时会话额度百分比 (%) |
| `weeklyThreshold` | `number` | `85` | 触发安全停止的每周额度百分比 (%) |
| `gracefulWrapUp` | `boolean` | `true` | 退出前是否允许 Claude 完成当前正在执行的文件编辑/命令 |
| `notifyOnStop` | `boolean` | `true` | 达到阈值时是否发送终端/桌面通知 |

---

## 工作原理

1. **实时监控：** 实时追踪 Token 消耗以及会话/每周配额指标。
2. **阈值拦截：** 一旦使用量超过设定阈值，`claude-ration` 会在下一个提示词周期前注入收尾信号。
3. **提交并暂停：** Claude 完成当前的原子化修改，总结进度并安全退出。

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
