# agent-skills

我的个人 agent skills 合集。一个技能一个目录，按 [skills](https://skills.sh) 的约定放在 `skills/<name>/`，
所以可以整包装，也可以只装其中一个。

## 技能

| 技能 | 做什么 |
|---|---|
| [cpp-reading-card](skills/cpp-reading-card) | 把一个 C++ 函数读成一张单文件 HTML 阅读卡：隐式输入输出、写入点、阈值链、所有权、自检题。带零依赖渲染器，可 `npx cpp-reading-card` |

## 安装

```sh
# 只装一个
npx skills add senqi-lin/agent-skills@cpp-reading-card -g

# 全装
npx skills add senqi-lin/agent-skills -g
```

`-g` = 用户级（`~/.agents/skills/`），装完任意工作区、任意会话可见；不加 `-g` 就装进当前项目。
更新：`npx skills update -g`。卸载：`npx skills remove <name> -g`。

## 结构约定

```
skills/<name>/SKILL.md     ← 入口，frontmatter 必须有 name + description
skills/<name>/...          ← 可选：脚本、模板、示例、package.json
```

`SKILL.md` 的 `name` 和目录名保持一致，`description` 写**什么时候该用**（不是写它是什么），
这两条决定了 agent 能不能在正确的时机把它捞出来。

`cpp-reading-card` 是唯一带 CLI 的：它有独立的 `package.json`，可以单独
`cd skills/cpp-reading-card && npm publish`，发出去之后别人就能 `npx cpp-reading-card`。
纯提示词技能不需要这一层。

## License

合集本体 MIT。各技能目录里的内容以各自的 `LICENSE` 为准——
比如 `skills/cpp-reading-card` 的工具是 MIT，而它的 `examples/` 含 ORB-SLAM3（GPLv3）的源码片段。
