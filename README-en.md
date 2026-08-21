# dsh-plugin-peak-pricing

A DeepSeek Harness peak/off-peak pricing badge (dual-face DSH plugin, pure UI, stateless, no network requests).

[中文](README.md)

[![dsh-plugin topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Overview

- **Expanded sidebar**: a single-line card pinned under the settings button
  `● Off-peak · 50% off · 2h12m until peak` (yellow dot = peak/full price, green dot = off-peak/half price).
  Hover for Beijing-time details.
- **Collapsed sidebar**: a centered colored dot (36px circular hover, same as the settings button).
  Hover to reveal a frosted popup with the full text.
- Refreshes every 30 seconds and switches automatically at each pricing-period boundary.
- UI copy is bilingual (Chinese/English) and live-switches with the DeepSeek Harness
  interface language (Settings → General → Language).

Pricing periods (Beijing time UTC+8, no DST): peak 09:00–12:00 and 14:00–18:00; all other
times are off-peak (half price).

## Compatibility

- Fully upgrade-verified against DeepSeek Harness **0.1.1-rc.1** (as of v1.1.1): the
  `sidebar.footer.action` slot contract, the sidebar footer class names (`hHd-Xa_footArea` /
  `hHd-Xa_collapsed`), and the locale service API are unchanged; badge rendering, live
  Chinese/English switching, and both expanded/collapsed states were verified in a real browser.
- Forward-checked against the npm `latest` (**0.1.1-rc.2**): the slot and class-name sets in
  `dsh-client-ui-sidebar` are unchanged, and `dsh-client-locale` / `dsh-client-modules` are
  byte-identical — no impact on this plugin.
- None of the rc7 → rc8 / 0.1.1 breaking changes (official image components no longer
  exported, `web_search` args reshaped to a `queries` array, credentials event renamed,
  `settingsScope.load()` removed, …) touch this plugin.

## Install

Install into the web profile from GitHub (requires `pnpm` on `PATH`; otherwise use the
corepack fallback below):

```sh
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

Or with an existing `dsh` binary:

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

When `pnpm` is not on `PATH`:

```sh
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
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

## Verify

```sh
curl -s http://127.0.0.1:3080/plugins/dsh-plugin-peak-pricing/client.js | head -c 60
```

It should print a factory bundle starting with `window.__ModuleLoader__.load({`; the badge
should be visible in the sidebar footer.

## Update

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
# or: npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
# or: cd ~/.dsh/profiles/web && corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v1.1.1"
```

Re-running the install command with the new `#v1.1.1` pin upgrades the dependency;
the loader row in `cordis.patch.yml` stays unchanged. Restart `dsh web`, then hard-refresh.

## Uninstall

```sh
cd ~/.dsh/profiles/web
corepack pnpm remove dsh-plugin-peak-pricing   # or: dsh plugin --profile web remove dsh-plugin-peak-pricing
```

Also remove the matching `insert` row from `cordis.patch.yml`, then restart `dsh web`.
This plugin is stateless and keeps no persistent data; the layout is fully restored after uninstall.

## Development

```sh
node --check lib/index.js lib/client.js
```

The client is a hand-written factory-CJS bundle
(`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`) with no build
step. The UI is registered through the `sidebar.footer.action` slot; `inject: ["slots", "locale"]`
guarantees the fiber applies after the slot runtime is ready and registers the zh/en
dictionaries with the harness locale service.

## Known limitations

- Badge positioning depends on the sidebar footer class names (`hHd-Xa_footArea`). If a DSH
  upgrade changes those class names, the badge falls back into the action row above the
  settings button (still functional); update the `:has()` selectors in `lib/client.js`.

## License

[MIT](LICENSE)
