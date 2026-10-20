# dsh-plugin-peak-pricing

A DeepSeek Harness peak/off-peak pricing badge (dual-face DSH plugin, pure UI, stateless,
no network requests) targeting **DeepSeek Harness 0.2.1+** on Web and Desktop.

[中文](README.md)

[![dsh-plugin topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Overview

- **Expanded sidebar**: a single-line card pinned under the settings button
  `● Off-peak · 50% off · 2h12m until peak` (yellow dot = peak/full price, green dot =
  off-peak/half price). Hover for Beijing-time details.
- **Collapsed sidebar**: a centered colored dot in the Web/Linux rail (36px circular hover,
  same as the settings button); on desktop zero-width collapse the floating dot uses a more
  compact 28px hit area. Hover to reveal a popup styled with the official DSH Tooltip colors
  and type scale.
- **Desktop collapsed**: macOS / Windows collapse the sidebar to zero width, so the dot is
  pinned to the viewport's bottom-left corner and remains hoverable. Web / Linux keep the
  56px rail and use the in-rail position.
- Refreshes every 30 seconds and switches automatically at each pricing-period boundary.
- UI copy is bilingual (Chinese/English) and live-switches with the DeepSeek Harness
  interface language (Settings → General → Language).

Pricing periods (Beijing time UTC+8, no DST): peak 09:00–12:00 and 14:00–18:00; all other
times are off-peak (half price). Starting 2026-08-24, Saturdays and Sundays are off-peak
all day (before that date weekends follow the intraday schedule above).

## Compatibility

- Target: DeepSeek Harness **0.2.1+**. Verified against the sidebar structure of Desktop
  `0.2.1-rc.2`: `sidebar.footer.action` is still a list slot, and the
  `footArea > footerActions + settingsArea` structure is unchanged.
- 0.2.1 sidebar styles use CSS Module build hashes (0.1.x `hHd-Xa_*` became `_3WPZCG_*`).
  v2.0.0 no longer pins a hash; it matches stable class-name suffixes
  (`footArea` / `collapsed` / `settingsArea`) plus the stable
  `data-slot="sidebar.footer.action"` attribute, so later 0.2.x builds are less likely to
  break positioning.
- 0.1.x is no longer a compatibility target. v2.0.0 changes the install shape from
  "plain dependency + hand-written loader row" to a `dsh.bundle` + `cordis.patch.yml`
  bundle.
- This plugin has no host route and no persisted state; all period calculation uses the
  browser's local clock.

## Install

### Bundle mode (recommended on 0.2.x)

Web (`dsh plugin` adds the package to the profile's `dsh.profile.bundles`; the bundle patch
inserts the loader row):

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
# or
npx @deepseek-ai/dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

Desktop: use the Desktop app's bundled CLI or the Plugins page
(`npx @deepseek-ai/dsh` rejects `--profile desktop`; the desktop profile is managed by the
Desktop app):

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

Restart the host after installing: restart `dsh web` for Web, or quit and reopen the app for
Desktop. `client-modules` caches package verdicts per process, so a new bundle does not
take effect until the host restarts.

> This package declares `dsh.bundle`, so it no longer prints
> `declares no dsh.bundle — installed as a plain dependency`.

### Manual mode (plain dependency)

If you prefer not to use the bundle layer, install the package as a normal dependency and
add the loader row yourself. **Do not** also add the package to `dsh.profile.bundles`, or it
will be activated twice.

```sh
# when pnpm is not on PATH
cd ~/.dsh/profiles/web
corepack pnpm add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

Add this to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-plugin-peak-pricing
      name: 'dsh-plugin-peak-pricing'
```

Then restart `dsh web` and hard-refresh the page. Manual profile edits are not recommended
for Desktop; use the Desktop CLI or Plugins page instead.

## Verify

```sh
cd dsh-plugin-peak-pricing
node --check lib/index.js lib/client.js
node --test
python3 -m json.tool package.json
```

Expected: 11 tests pass, covering the factory id, `sidebar.footer.action` registration,
zh/en dictionary parity, weekday/weekend/pre-policy period calculation, and the 0.2.1
footer selectors.

In the UI (after restart):

1. Expanded sidebar: the pricing card appears below the settings button. Switch
   Settings → General → Language; the copy must switch in place.
2. Web collapsed sidebar: the 56px rail shows a colored dot below the settings button;
   hover reveals the popup.
3. Desktop collapsed sidebar (macOS / Windows): the dot is pinned to the window's
   bottom-left corner and remains hoverable.

> This plugin has no `/api/...` route. Do not verify with the old anonymous
> `GET /plugins/dsh-plugin-peak-pricing/client.js`: 0.2.1 no longer serves that path, and
> client bundles load through the authenticated boot graph. Also do not treat a 401 from
> `/api/...` as proof that the plugin loaded — the `/api` auth gate answers before route
> dispatch.

## Update

Re-run the install command with the new `#v2.0.0` pin. In bundle mode no
`cordis.patch.yml` change is needed:

```sh
dsh plugin --profile web add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
# Desktop
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "github:c-ling/dsh-plugin-peak-pricing#v2.0.0"
```

Restart the host, then hard-refresh the page / reopen Desktop.

## Uninstall

```sh
dsh plugin --profile web remove dsh-plugin-peak-pricing
# or manually: cd ~/.dsh/profiles/web && corepack pnpm remove dsh-plugin-peak-pricing
```

On Desktop use the Plugins page, or the Desktop CLI
`plugin --profile desktop remove ...`. Bundle mode also removes the
`dsh.profile.bundles` entry; manual mode additionally requires deleting the matching
`insert` row from `cordis.patch.yml`. This plugin is stateless and keeps no persistent data;
the layout is fully restored after uninstall.

## Development

```sh
node --check lib/index.js lib/client.js
node --test
python3 -m json.tool package.json
git diff --check
```

The client is a hand-written factory-CJS bundle
(`window.__ModuleLoader__.load({ id: "dsh-plugin-peak-pricing", factory })`) with no build
step. The UI is registered through the `sidebar.footer.action` slot;
`inject: ["slots", "locale"]` guarantees the fiber applies after the slot runtime is ready
and registers the zh/en dictionaries with the harness locale service.

The 0.2.1 footer positioning CSS lives in the `css` array of `lib/client.js`:

- expanded / rail: `[class*='footArea']` / `[class*='collapsed']` with
  `:has(.dsh-peak-region)`;
- desktop zero-width collapse: `html[data-platform='darwin']` /
  `html[data-windows-titlebar]` + `[data-sidebar-collapsed]`, with the dot
  `position: fixed`;
- other entries sharing the footer are hidden on desktop collapse via
  `[data-slot='sidebar.footer.action'] > :not(.dsh-peak-region)`.
- Color tokens: the expanded card uses `--dsw-alias-button-elevated-fill` +
  `--dsw-alias-border-l3`; the tooltip uses `--dsw-alias-tooltip-bg` with the official
  white text and 13px/20px type scale, matching the built-in DSH buttons/Tooltip.

Tests: `test/client.test.mjs` (VM-evaluated bundle, period logic, dictionary and CSS
assertions) and `test/host.test.mjs` (empty host half + bundle manifest/patch).

## Known limitations

- Positioning depends on the stable sidebar footer class-name suffixes
  (`footArea` / `collapsed`) and `data-slot="sidebar.footer.action"`. If a future DSH
  release changes those contracts, the badge still renders in the footer action row
  (functional) but may move above the settings button; update the `:has()` selectors in
  `lib/client.js`.
- The desktop collapsed dot is fixed at `left:12px; bottom:12px`. If a future desktop
  window adds a bottom-left control, that offset may need adjustment.
- Period calculation uses the local clock; manual system-time changes show up at the next
  30-second refresh.

## License

[MIT](LICENSE)
