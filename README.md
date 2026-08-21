# dsh-plugin-peak-pricing

DeepSeek Harness 峰谷定价时段徽章（DSH 双面插件，纯 UI、无状态、无网络请求）。

[English](README-en.md)

[![dsh-plugin topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 简介

- **展开状态**：侧边栏设置按钮下方贴底的一条单行卡片
  `● 空闲时段 · 半价 · 2小时12分后进入高峰`（黄点 = 高峰全价，绿点 = 空闲半价），
  悬停显示北京时间详情。
- **收起状态**：居中的彩色圆点（36px 圆形 hover 与设置按钮一致），
  悬停弹出磨砂浮窗显示完整文案。
- 每 30 秒刷新一次；时段边界一到自动切换。
- 文案支持中英双语，随 DeepSeek Harness 的界面语言设置（Settings → General → Language）实时切换。

时段规则（北京时间 UTC+8，无夏令时）：高峰 09:00–12:00、14:00–18:00，其余为空闲（半价）。

## 兼容性

- 已针对 DeepSeek Harness **0.1.1-rc.1** 完成全量升级验证（自 v1.1.1 起）：`sidebar.footer.action`
  插槽契约、侧边栏脚部样式类名（`hHd-Xa_footArea` / `hHd-Xa_collapsed`）、locale 服务 API 均未变化；
  徽章渲染、中英实时切换、展开/收起两种形态均通过真实浏览器实测。
- 已前向核对 npm `latest`（**0.1.1-rc.2**）：`dsh-client-ui-sidebar` 的插槽与类名集合不变，
  `dsh-client-locale` / `dsh-client-modules` 逐字节一致——对本插件无影响。
- rc7 → rc8 / 0.1.1 的全部破坏性变更（官方图片组件停止导出、`web_search` 参数改为 `queries` 数组、
  credentials 事件改名、`settingsScope.load()` 移除等）均不涉及本插件。

## 安装

从 GitHub 安装到 web profile（需要 `pnpm` 在 `PATH` 上；没有则用下面的 corepack 方式）：

```sh
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

或使用已有的 `dsh` 命令：

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

pnpm 不在 `PATH` 上时：

```sh
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
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

## 验证

```sh
curl -s http://127.0.0.1:3080/plugins/dsh-plugin-peak-pricing/client.js | head -c 60
```

应输出 `window.__ModuleLoader__.load({` 开头的 factory bundle；页面侧边栏脚部能看到徽章。

## 更新

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
# 或：npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
# 或：cd ~/.dsh/profiles/web && corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

用新的 `#v1.1.1` 重新执行安装命令即可升级依赖；`cordis.patch.yml` 中的 loader 行保持不变。
重启 `dsh web`，然后硬刷新页面。

## 卸载

```sh
cd ~/.dsh/profiles/web
corepack pnpm remove dsh-plugin-peak-pricing   # 或 dsh plugin --profile web remove dsh-plugin-peak-pricing
```

同时删除 `cordis.patch.yml` 中对应的 insert 行，然后重启 `dsh web`。
本插件无状态、无持久化数据，卸载后布局完全还原。

## 开发

```sh
node --check lib/index.js lib/client.js
```

客户端为手写 factory-CJS bundle（`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`），
无构建步骤；UI 通过 `sidebar.footer.action` 插槽注册，`inject: ["slots", "locale"]` 保证 fiber 在插槽就绪后
apply，并通过 locale 服务注册中英文案字典，随 harness 配置切换。

## 已知限制

- 徽章定位依赖侧边栏脚部的样式类名（`hHd-Xa_footArea`），DSH 升级后若类名变化，
  徽章会回退到设置按钮上方的操作条中（不影响功能），需同步更新 `lib/client.js`
  中的 `:has()` 选择器。

## License

[MIT](LICENSE)
