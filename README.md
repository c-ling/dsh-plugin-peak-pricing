# dsh-plugin-peak-pricing

DeepSeek Harness 峰谷定价时段徽章（DSH 双面插件，纯 UI、无状态、无网络请求），
目标运行时 **DeepSeek Harness 0.2.1+**（Web 与 Desktop）。

[English](README-en.md)

[![dsh-plugin topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 简介

- **展开状态**：侧边栏设置按钮下方贴底的一条单行卡片
  `● 空闲时段 · 半价 · 2小时12分后进入高峰`（黄点 = 高峰全价，绿点 = 空闲半价），
  悬停显示北京时间详情。
- **收起状态**：Web/Linux 轨道内居中的彩色圆点（36px 圆形 hover，与设置按钮一致）；
  桌面端 0 宽收起时改用更紧凑的 28px 浮动圆点。悬停弹出与 DSH 官方 Tooltip 同配色/字号的浮窗显示完整文案。
- **Desktop 收起**：macOS / Windows 桌面端收起侧边栏时整列宽度为 0，徽章把圆点固定到
  视口左下角，仍然可以悬停查看详情；Web / Linux 保留 56px 轨道，沿用轨道内定位。
- 每 30 秒刷新一次；时段边界一到自动切换。
- 文案支持中英双语，随 DeepSeek Harness 的界面语言设置（Settings → General → Language）实时切换。

时段规则（北京时间 UTC+8，无夏令时）：高峰 09:00–12:00、14:00–18:00，其余为空闲（半价）；
自 2026-08-24 起，周六、周日全天为空闲时段（此前周末仍按上述时段规则）。

## 兼容性

- 目标：DeepSeek Harness **0.2.1+**。已在 Desktop `0.2.1-rc.2` 的侧边栏结构上核对：
  `sidebar.footer.action` 仍是 list slot，`footArea > footerActions + settingsArea` 结构不变。
- 0.2.1 的侧边栏样式类名是 CSS Module 构建 hash（0.1.x 的 `hHd-Xa_*` 已变为 `_3WPZCG_*`）。
  v2.0.0 不再写死 hash，而是匹配稳定的类名后缀（`footArea` / `collapsed` / `settingsArea`）
  和稳定的 `data-slot="sidebar.footer.action"` 属性，因此对后续 0.2.x 小版本更稳。
- 0.1.x 不再是兼容目标；v2.0.0 起安装形态从「plain dependency + 手写 loader 行」切换为
  「`dsh.bundle` + `cordis.patch.yml` bundle」。
- 本插件没有 host 路由、没有持久化状态；所有时段计算都用浏览器本地时钟完成。

## 安装

### Bundle 模式（0.2.x 推荐）

Web（`dsh plugin` 会把包加入 profile 的 `dsh.profile.bundles`，bundle patch 负责插入 loader 行）：

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
# 或
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

Desktop：使用 Desktop 自带 CLI 或「Plugins」页面（`npx @deepseek-ai/dsh` 会拒绝
`--profile desktop`，桌面 profile 由 Desktop App 管理）：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

安装后重启宿主：Web 重启 `dsh web`；Desktop 退出并重新打开 App。
`client-modules` 按进程缓存包裁决，新 bundle 不重启不会生效。

> 本包声明了 `dsh.bundle`，不会再出现
> `declares no dsh.bundle — installed as a plain dependency` 警告。

### 手动模式（plain dependency）

如果不想用 bundle，也可以把包作为普通依赖安装，然后自己加 loader 行。
**不要同时**把包加入 `dsh.profile.bundles`，否则会重复激活。

```sh
# pnpm 不在 PATH 上时
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

在 `~/.dsh/profiles/web/cordis.patch.yml` 增加：

```yaml
- insert:
    - id: dsh-plugin-peak-pricing
      name: 'dsh-plugin-peak-pricing'
```

然后重启 `dsh web` 并硬刷新页面。Desktop 端不推荐手动改 profile；
请用上面的 Desktop CLI 或 Plugins 页面。

## 验证

```sh
cd dsh-plugin-peak-pricing
node --check lib/index.js lib/client.js
node --test
python3 -m json.tool package.json
```

预期：11 项测试全绿，覆盖 factory id、`sidebar.footer.action` 注册、中英词典 parity、
工作日/周末/政策生效前后的时段计算，以及 0.2.1 脚部选择器。

页面侧验证（重启后）：

1. 展开侧边栏：设置按钮下方出现时段卡片；切换 Settings → General → Language，
   文案应原地切换为中文/英文。
2. Web 收起侧边栏：出现 56px 轨道，设置按钮下方是彩色圆点；悬停显示浮窗。
3. Desktop 收起侧边栏（macOS / Windows）：圆点固定在窗口左下角，悬停仍可查看详情。

> 本插件没有 `/api/...` 路由。不要用旧的匿名
> `GET /plugins/dsh-plugin-peak-pricing/client.js` 验证：0.2.1 不再提供该路径，
> 客户端 bundle 通过认证后的启动图加载。也不要因为 `/api/...` 返回 401 就认为插件已加载——
> `/api` 认证门会在路由分发前返回 401。

## 更新

用新的 `#v2.0.0` 重新执行安装命令即可；bundle 模式不需要改 `cordis.patch.yml`：

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
# Desktop
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

重启宿主，然后硬刷新页面 / 重开 Desktop。

## 卸载

```sh
dsh plugin --profile web remove dsh-plugin-peak-pricing
# 或手动：cd ~/.dsh/profiles/web && corepack pnpm remove dsh-plugin-peak-pricing
```

Desktop 用 Plugins 页面移除，或用 Desktop 自带 CLI `plugin --profile desktop remove ...`。
bundle 模式会同时移除 `dsh.profile.bundles` 中的条目；手动模式还需删除
`cordis.patch.yml` 中对应的 insert 行。本插件无状态、无持久化数据，卸载后布局完全还原。

## 开发

```sh
node --check lib/index.js lib/client.js
node --test
python3 -m json.tool package.json
git diff --check
```

客户端为手写 factory-CJS bundle（`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`），
无构建步骤；UI 通过 `sidebar.footer.action` 插槽注册，`inject: ["slots", "locale"]` 保证 fiber
在插槽就绪后 apply，并通过 locale 服务注册中英文案字典。

0.2.1 脚部定位相关 CSS 集中在 `lib/client.js` 的 `css` 数组：

- 展开/轨道态：`[class*='footArea']` / `[class*='collapsed']` + `:has(.dsh-peak-region)`；
- 桌面端 0 宽收起：`html[data-platform='darwin']` / `html[data-windows-titlebar]` +
  `[data-sidebar-collapsed]`，圆点 `position: fixed`；
- 共享 footer 的其它插件条目在桌面收起时通过
  `[data-slot='sidebar.footer.action'] > :not(.dsh-peak-region)` 隐藏，避免残影。
- 颜色 token：展开卡片用 `--dsw-alias-button-elevated-fill` +
  `--dsw-alias-border-l3`；tooltip 用 `--dsw-alias-tooltip-bg` + 官方白字、13px/20px
  字号，与 DSH 内置按钮/Tooltip 保持一致。

测试文件：`test/client.test.mjs`（VM 执行 bundle、时段逻辑、词典与 CSS 断言）、
`test/host.test.mjs`（host 空实现 + bundle manifest/patch）。

## 已知限制

- 定位依赖侧边栏脚部的稳定类名后缀（`footArea` / `collapsed`）和
  `data-slot="sidebar.footer.action"`。如果未来 DSH 改掉这些约定，徽章仍会渲染在
  footer 操作条中（功能不受影响），但可能回到设置按钮上方；需要同步更新
  `lib/client.js` 中的 `:has()` 选择器。
- 桌面端收起态的左下角圆点位置是固定的（`left:12px; bottom:12px`）。如果未来桌面窗口
  增加左下角控件，可能需要调整这个偏移。
- 时段判断使用本机时钟；系统时间被手动修改时会立即反映到下一次 30 秒刷新。

## License

[MIT](LICENSE)
