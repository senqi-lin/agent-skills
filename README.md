# cpp-reading-card

把大型 C++ 工程里的**一个函数**，读成一张单文件 HTML 阅读卡：隐式输入输出、写入点、阈值链、所有权、自检题。

不是文档生成器。文档回答「它做了什么」，这张卡回答**「它的边界在哪，我改哪一行会炸」**。

```sh
node bin/cpp-reading-card.mjs examples/orb-slam3/02-track-with-motion-model.json
# ✓ examples/orb-slam3/02-track-with-motion-model.html  (7 sections, 35.3 KB)
```

双击打开，不联网、不引外部资源、可以 email 给同事。

## 为什么是「工具」而不是「插件」

这个问题值得先说清楚，因为它决定了仓库长什么样。

这一页真正的价值是三样东西：**一套读法**（先定边界再下钻）、**一个固定版式**（同样的六个问题，每页都问一遍）、**可复现的产出**（JSON 进 git，改一行重渲染）。这三样都不需要宿主提供 UI、数据层或 IPC。

| | skill + CLI（本仓库） | 宿主插件（cordis / VS Code 扩展） |
|---|---|---|
| 在 DSH 里用 | ✅ | ✅ |
| 在 Claude Code / Cursor / Copilot 里用 | ✅ 同一份 `SKILL.md` | ❌ 只能活在一个宿主里 |
| 产出可 diff、可 review | ✅ JSON | ✅ 但要额外写 UI |
| 需要写客户端 / React / 发版兼容 | 不需要 | 需要 |
| 装错版本的代价 | 无 | 白屏 |

所以 v0.1 是一个**零依赖 CLI + 一份 agent skill**。它天然就是「插件」——任何能读 `SKILL.md` 的 agent 装上就能用，而且不需要为任何一个宿主的插件 API 买单。

真要升格成 DSH 插件，缺的是这两块（见 Roadmap）：一个 host 工具把「渲染」暴露成 agent 可调用的 `card_render`，一个客户端右栏面板直接预览。**在没人用之前先写这两块，是把顺序搞反了。**

## 快速开始

需要 Node.js ≥ 18（只用 `node:fs` / `node:path`，没有依赖）。

```sh
# 1. 从卡片渲染
node bin/cpp-reading-card.mjs examples/orb-slam3/02-track-with-motion-model.json

# 2. 源码不在默认位置时，指向仓库根目录
node bin/cpp-reading-card.mjs card.json --src-root /path/to/ORB_SLAM3

# 3. 只要 HTML，不写文件
node bin/cpp-reading-card.mjs card.json --stdout > out.html
```

`code` 段落只在**构建期**按行号切片，所以卡片里不存源码——源码改了，重渲染一次就对上了；行号漂了会直接报错，而不是悄悄展示旧代码。

## 卡片长什么样

```jsonc
{
  "meta": {
    "eyebrow": "ORB-SLAM3 · 单目 · 正常跟踪的第二条分支",
    "returnType": "bool",
    "signature": "Tracking::TrackWithMotionModel()",
    "summary": "一句话：用上一帧怎么动的，猜出这一帧的位姿……",
    "badges": [{ "kind": "k", "text": "src/Tracking.cc:2854–2947" }],
    "srcRoot": "../ORB_SLAM3"        // 可选：相对卡片文件；也可命令行 --src-root
  },
  "sections": [
    { "kind": "invariant",  "title": "…", "rows": [ … ] },
    { "kind": "lanes",      "title": "调用链 × 隐式数据流", "steps": [ … ] },
    { "kind": "table",      "title": "对象与类型：谁拥有、活多久", "cols": [ … ], "rows": [ … ] },
    { "kind": "compare",    "title": "参考帧匹配 vs 运动模型预测", "a": "…", "b": "…", "rows": [ … ] },
    { "kind": "code",       "title": "源码：读写在哪一行", "file": "src/Tracking.cc", "start": 2854, "end": 2947,
                            "marks": { "2876": "w", "2889": "g", "2909": "o" } },
    { "kind": "checklist",  "title": "读完自检", "items": [ … ] }
  ]
}
```

七种 section 完整字段见 [`schema/card.schema.json`](schema/card.schema.json)，读法见 [`SKILL.md`](SKILL.md)：

| kind | 回答什么 |
|---|---|
| `invariant` | 读代码前必须记住的结构前提（数组形状、索引语义） |
| `lanes` | 主图：执行顺序 × 读列 × 写列，`gate`/`opt` 高亮 |
| `table` | 对象与所有权：谁拥有、活多久、别的线程会不会改 |
| `compare` | 两个函数/两条分支并排，`diff` 标真正的行为差异 |
| `gates` | 阈值链：每个数字各管什么（粗筛/精筛/重试） |
| `code` | 真实源码，按行标 `r` 读 / `w` 写 / `g` 门 / `o` 下钻 |
| `checklist` | 读完自检，逼读者回到边界 |

## 装到本机（一次，所有工作区、所有会话可见）

技能装在**用户级**目录，和具体项目无关：

```
C:\Users\<你>\.agents\skills\<skill>\SKILL.md      # Windows
~/.agents/skills/<skill>/SKILL.md                  # macOS / Linux
```

装：

```sh
npx skills add <owner>/cpp-reading-card -g   # 发布后：从 GitHub 装
npx skills add . -g                          # 还没发布：从本地目录装
```

`-g` = 用户级；不加就装进当前项目（`.agents/skills/`）。装完它会顺带给 Claude Code / Codex / Copilot / OpenCode 建好链接，不用手动复制。

验证：`npx skills list`，然后在**任意工作区开一个新会话**，技能列表里应该就有 `cpp-reading-card`。

- **DSH**：读的就是这个目录，新会话立刻可见，不用重启应用（本机已装好并验证过）。
- **更新**：`npx skills update cpp-reading-card -g`。自己改仓库时重跑 `npx skills add . -g` 更省事——装的是**副本**，不会跟着源目录实时变。
- **卸载**：`npx skills remove cpp-reading-card -g`。
- **只想某个项目用**：在项目里跑 `npx skills add . -p`，生成 `.agents/skills/`。
- **任何聊天窗口**：把 `SKILL.md` 正文贴进对话，再说「按这个读 `Tracking::TrackWithMotionModel`」。没有 CLI 也能用——agent 自己写 HTML，只是没这么一致。

## 示例

`examples/orb-slam3/` 是同一份代码库里的相邻两条分支，**并排读才有价值**：

| 页面 | 内容 |
|---|---|
| [`01-track-reference-keyframe.html`](examples/orb-slam3/01-track-reference-keyframe.html) | `TrackReferenceKeyFrame()`：词袋反查 + 8 步数据流（手写版，模板的来源） |
| [`02-track-with-motion-model.html`](examples/orb-slam3/02-track-with-motion-model.html) | `TrackWithMotionModel()`：位姿预测 + 11 步数据流 + 并排对比 + 源码标注 |
| [`index.html`](examples/orb-slam3/index.html) | 两页并排打开 |

## 已知限制

- **HTML 片段不过滤**：`body`、`note` 里的 HTML 原样输出。卡片是你自己写的，这是刻意的取舍；如果要接收别人提交的卡片，先加一层白名单。
- **行号会漂**：`code` 段落按行号切片。函数上方插一行，就得改卡片——渲染时不会自动对齐（宁可报错也不展示错位的代码）。
- **只出 HTML，不出图**：这是刻意的。HTML 能跳转、能搜、能贴链接、改一行重渲染，PNG 都不能。要截图自己开浏览器截。
- **示例卡片要带 `--src-root` 才能重渲染**：源码不进仓库，`examples/orb-slam3/*.json` 里的 `code` 段落需要指向你自己的 ORB-SLAM3 副本。已渲染好的 HTML 直接能看。
- **只对「函数级」有效**：整个类、整个模块得先拆成函数，一张卡一个。

## Roadmap

- [ ] `--check`：schema 校验 + 阈值/写操作的空缺提示（agent 最容易漏这两块）
- [ ] `index.json` 自动生成：一个模块下的卡片自动汇总成目录页
- [ ] 英文模板（`lang: en` 目前只切 `<html lang>`，文案还是中文的）

## 仓库结构

```
bin/cpp-reading-card.mjs    渲染器（零依赖）
assets/card.css             版式，单文件内联进 HTML
schema/card.schema.json     卡片 schema
SKILL.md                    读法 + 产出契约（给 agent 的那份）
examples/orb-slam3/         ORB-SLAM3 的两个分支示例 + 并排入口
tools/check-html.mjs        结构自检：标签闭合、section/行数/标注计数
tools/extract-css.mjs       一次性工具：从旧页面抽 CSS
```

自检（改动模板后跑一遍）：

```sh
npm run check    # 结构：标签闭合、7 个 section、30 处标注、0 处源码告警
```

## 发布

一个 GitHub 仓库就够了；npm 包是可选加项（**不冲突**：仓库给人看、给 `skills` 装，npm 给 `npx cpp-reading-card` 用）。

```sh
cd D:\Projects\private\cpp-reading-card
git init -b main
git add -A
git commit -m "v0.1.0: 渲染器 + schema + skill + 两个示例"

gh repo create cpp-reading-card --public --source . --push
```

然后把 `package.json` 里的 `repository.url` 从占位符换成真实地址。想发 npm 再：

```sh
npm login
npm publish --dry-run     # 先看打包内容：只有 bin/assets/schema/SKILL.md/README/LICENSE
npm publish
```

发布后别人两条命令任选：

```sh
npx skills add <你的用户名>/cpp-reading-card -g    # 装 skill（进任意 agent）
npx cpp-reading-card card.json                     # 或用 CLI（需 npm 发布过）
```

两个实测结论，省得你纠结仓库结构：

- `skills add` **认根目录的 `SKILL.md`**，不需要改成 `skills/<name>/` 布局（本机装的就是根目录这份）。
- 只有一个 skill 时**别急着建「个人 skills 合集」仓库**。合集适合纯提示词类技能；带 CLI 的单独一个仓库更干净，包名也不会变成 `@you/agent-skills/cpp-reading-card`。等你有三四个纯提示词技能了，再建 `agent-skills` 合集不迟。

## License

MIT。示例里的 ORB-SLAM3 代码片段版权归原作者（GPLv3），本仓库只在构建期读取、不重新分发源码。
