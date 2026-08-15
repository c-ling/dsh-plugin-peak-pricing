# dsh-plugin-peak-pricing

DeepSeek Harness 峰谷定价时段徽章（DSH 双面插件，纯 UI、无状态、无网络请求）。
A DeepSeek Harness peak/off-peak pricing badge (dual-face DSH plugin, pure UI, stateless, no network requests).

[English](#english) | [中文](#中文)

[![dsh-plugin topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

<a id="english"></a>

## English

- **Expanded sidebar**: a single-line card pinned under the settings button
  `● Off-peak · 50% off · 2h12m until peak` (yellow dot = peak/full price, green dot = off-peak/half price).
  Hover for Beijing-time details.
- **Collapsed sidebar**: a centered colored dot (36px circular hover, same as the settings button).
  Hover to reveal a frosted popup with the full text.
- Refreshes every 30 seconds and switches automatically at each pricing-period boundary.

Pricing periods (Beijing time UTC+8, no DST): peak 09:00–12:00 and 14:00–18:00; all other
times are off-peak (half price).

### Install

Install into the web profile from GitHub (requires `pnpm` on `PATH`; otherwise use the
corepack fallback below):

```sh
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

Or with an existing `dsh` binary:

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

When `pnpm` is not on `PATH`:

```sh
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

> `dsh plugin` forwards its arguments to pnpm and fetches the package from this repo
> (pnpm 9+, `git` required). The warning
> `declares no dsh.bundle — installed as a plain dependency` is expected: this plugin is
> not a profile bundle layer; it is activated by the loader row below.

Then add a loader row to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: peak-pricing
      name: 'dsh-plugin-peak-pricing'
```

Restart `dsh web` (client-modules caches package verdicts per process; new packages require a
host restart), then hard-refresh the page. The badge appears under the sidebar settings button.

### Verify

```sh
curl -s http://127.0.0.1:3080/plugins/dsh-plugin-peak-pricing/client.js | head -c 60
```

It should print a factory bundle starting with `window.__ModuleLoader__.load({`; the badge
should be visible in the sidebar footer.

### Uninstall

```sh
cd ~/.dsh/profiles/web
corepack pnpm remove dsh-plugin-peak-pricing   # or: dsh plugin --profile web remove dsh-plugin-peak-pricing
```

Also remove the matching `insert` row from `cordis.patch.yml`, then restart `dsh web`.
This plugin is stateless and keeps no persistent data; the layout is fully restored after uninstall.

### Development

```sh
node --check lib/index.js lib/client.js
```

The client is a hand-written factory-CJS bundle
(`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`) with no build
step. The UI is registered through the `sidebar.footer.action` slot; `inject: ["slots"]`
guarantees the fiber applies after the slot runtime is ready.

### Known limitations

- Badge positioning depends on the sidebar footer class names (`hHd-Xa_footArea`). If a DSH
  upgrade changes those class names, the badge falls back into the action row above the
  settings button (still functional); update the `:has()` selectors in `lib/client.js`.
- The UI copy is in Chinese and is not yet wired into the locale dictionary.

### License

[MIT](LICENSE)

---

<a id="chinese"></a>

## 中文

- **展开状态**：侧边栏设置按钮下方贴底的一条单行卡片
  `● 空闲时段 · 半价 · 2小时12分后进入高峰`（黄点 = 高峰全价，绿点 = 空闲半价），
  悬停显示北京时间详情。
- **收起状态**：居中的彩色圆点（36px 圆形 hover 与设置按钮一致），
  悬停弹出磨砂浮窗显示完整文案。
- 每 30 秒刷新一次；时段边界一到自动切换。

时段规则（北京时间 UTC+8，无夏令时）：高峰 09:00–12:00、14:00–18:00，其余为空闲（半价）。

### 安装

从 GitHub 安装到 web profile（需要 `pnpm` 在 `PATH` 上；没有则用下面的 corepack 方式）：

```sh
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

或使用已有的 `dsh` 命令：

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

pnpm 不在 `PATH` 上时：

```sh
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.0.1"
```

> `dsh plugin` 把参数原样转发给 pnpm，直接从本仓库拉取包（pnpm 9+，本机需装有 `git`）。
> 安装时若看到 `declares no dsh.bundle — installed as a plain dependency` 的提示属正常现象：
> 本插件不是 profile bundle 层，而是通过下面的 loader 行激活。

然后在 `~/.dsh/profiles/web/cordis.patch.yml` 增加一行插入：

```yaml
- insert:
    - id: peak-pricing
      name: 'dsh-plugin-peak-pricing'
```

重启 `dsh web`（client-modules 按进程缓存包裁决，新包必须重启宿主），然后硬刷新页面，
侧边栏设置按钮下方即出现时段徽章。

### 验证

```sh
curl -s http://127.0.0.1:3080/plugins/dsh-plugin-peak-pricing/client.js | head -c 60
```

应输出 `window.__ModuleLoader__.load({` 开头的 factory bundle；页面侧边栏脚部能看到徽章。

### 卸载

```sh
cd ~/.dsh/profiles/web
corepack pnpm remove dsh-plugin-peak-pricing   # 或 dsh plugin --profile web remove dsh-plugin-peak-pricing
```

同时删除 `cordis.patch.yml` 中对应的 insert 行，然后重启 `dsh web`。
本插件无状态、无持久化数据，卸载后布局完全还原。

### 开发

```sh
node --check lib/index.js lib/client.js
```

客户端为手写 factory-CJS bundle（`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`），
无构建步骤；UI 通过 `sidebar.footer.action` 插槽注册，`inject: ["slots"]` 保证 fiber 在插槽就绪后 apply。

### 已知限制

- 徽章定位依赖侧边栏脚部的样式类名（`hHd-Xa_footArea`），DSH 升级后若类名变化，
  徽章会回退到设置按钮上方的操作条中（不影响功能），需同步更新 `lib/client.js`
  中的 `:has()` 选择器。
- 文案为中文，未接入 locale 字典。

### License

[MIT](LICENSE)
