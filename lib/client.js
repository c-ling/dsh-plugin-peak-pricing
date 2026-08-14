/**
 * dsh-plugin-peak-pricing client half: the browser bundle (factory-CJS, hand-written,
 * no build step).
 *
 * DeepSeek 峰谷定价时段（北京时间 UTC+8，无夏令时）：
 *   高峰时段 09:00-12:00、14:00-18:00；其余为空闲时段（半价）。
 *
 * Registers one sidebar contribution in `sidebar.footer.action`:
 *   - 展开状态：设置按钮下方贴底的一条单行卡片（圆点 + 时段/价格 + 切换倒计时）
 *   - 收起状态：居中的圆点（36px 圆形 hover 与设置按钮一致），点击弹出磨砂浮窗
 *
 * 位置实现：侧边栏脚部默认「操作条在上、设置行在底」，本插件通过一条仅在徽章
 * 存在时生效的 :has() 规则为脚部预留底部空间，并把徽章绝对定位到设置按钮下方，
 * 不修改产品代码；插件卸载后规则与元素一并消失，布局完全还原。
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-peak-pricing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");

    // ── 峰谷时段计算（纯浏览器 Date）──────────────────────────────────────

    var BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
    // 自北京时间零点起的分钟数：9:00 / 12:00 / 14:00 / 18:00 / 24:00
    var BOUNDARIES = [540, 720, 840, 1080, 1440];

    function computeStatus() {
      var beijing = new Date(Date.now() + BJ_OFFSET_MS);
      var h = beijing.getUTCHours();
      var m = beijing.getUTCMinutes();
      var minutesOfDay = h * 60 + m;
      var period =
        (minutesOfDay >= 540 && minutesOfDay < 720) || (minutesOfDay >= 840 && minutesOfDay < 1080)
          ? "peak"
          : "offpeak";
      var nextBoundary = 1440;
      for (var i = 0; i < BOUNDARIES.length; i++) {
        if (BOUNDARIES[i] > minutesOfDay) {
          nextBoundary = BOUNDARIES[i];
          break;
        }
      }
      // 进入高峰的边界是 9:00 和 14:00；其余边界（12:00/18:00/零点）都进入空闲
      var nextPeriod = nextBoundary === 540 || nextBoundary === 840 ? "peak" : "offpeak";
      var pad = function (n) {
        return (n < 10 ? "0" : "") + n;
      };
      return {
        period: period,
        nextPeriod: nextPeriod,
        msUntilNext: (nextBoundary - minutesOfDay) * 60 * 1000,
        timeLabel: pad(h) + ":" + pad(m),
      };
    }

    function formatCountdown(ms) {
      var totalMin = Math.round(ms / 60000);
      var h = Math.floor(totalMin / 60);
      var m = totalMin % 60;
      if (h <= 0) return m + "分钟";
      return h + "小时" + (m > 0 ? m + "分" : "");
    }

    // ── styles ─────────────────────────────────────────────────────────────

    var css = [
      "/* 仅当本徽章存在时：预留紧凑的底部空间，并把徽章定位到设置按钮下方 */",
      ".hHd-Xa_footArea:has(.dsh-peak-region) { position: relative; padding-bottom: 37px; }",
      ".hHd-Xa_footArea:has(.dsh-peak-region) .dsh-peak-region { position: absolute; left: 0; right: 0; bottom: 3px; height: 32px; }",
      "/* 收起状态：预留更高空间，容纳 36px 圆形 hover，与设置按钮一致 */",
      ".hHd-Xa_collapsed .hHd-Xa_footArea:has(.dsh-peak-region) { padding-bottom: 41px; }",
      ".hHd-Xa_collapsed .hHd-Xa_footArea:has(.dsh-peak-region) .dsh-peak-region { height: 36px; }",
      ".dsh-peak-region { box-sizing: border-box; display: flex; align-items: center; min-width: 0; }",
      ".dsh-peak-card { justify-content: flex-start; gap: 6px; padding: 6px 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); font-size: 12px; line-height: 18px; cursor: default; white-space: nowrap; overflow: hidden; }",
      ".dsh-peak-rail { justify-content: center; }",
      ".dsh-peak-circle { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: transparent; border: none; padding: 0; cursor: pointer; font: inherit; }",
      ".dsh-peak-circle:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      "/* 收起状态下圆点固定在视口左下角，浮窗用纯 CSS 固定坐标锚定 */",
      ".dsh-peak-popup { position: fixed; left: 64px; bottom: 8px; z-index: 40; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-overlay); background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 88%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--dsw-alias-border-l1); box-shadow: var(--dsw-shadow-lv2); font-size: 12px; line-height: 18px; white-space: nowrap; }",
      "/* hover 显示：圆点区域或浮窗本身被指向时可见，移开即隐藏 */",
      ".dsh-peak-popup { visibility: hidden; opacity: 0; transition: opacity 0.12s ease, visibility 0.12s; }",
      ".dsh-peak-region:hover .dsh-peak-popup, .dsh-peak-popup:hover { visibility: visible; opacity: 1; }",
      ".dsh-peak-popup .dsh-peak-dot { width: 10px; height: 10px; }",
      ".dsh-peak-popup-main { color: var(--dsw-alias-label-primary); font-weight: 500; }",
      ".dsh-peak-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }",
      ".dsh-peak-rail .dsh-peak-dot { width: 10px; height: 10px; }",
      ".dsh-peak-peak .dsh-peak-dot { background: var(--dsw-alias-state-warn-primary); }",
      ".dsh-peak-offpeak .dsh-peak-dot { background: var(--dsw-alias-state-success-primary); }",
      ".dsh-peak-neutral .dsh-peak-dot { background: var(--dsw-alias-label-secondary); }",
      ".dsh-peak-line { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--dsw-alias-label-primary); font-weight: 500; }",
      ".dsh-peak-count { color: var(--dsw-alias-label-secondary); font-weight: 400; }",
    ].join("\n");

    var cssTagId = "dsh-plugin-peak-pricing/styles";
    if (
      typeof document !== "undefined" &&
      document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null
    ) {
      var styleTag = document.createElement("style");
      styleTag.dataset.plugin = "dsh-plugin-peak-pricing";
      styleTag.dataset.pluginCss = cssTagId;
      styleTag.textContent = css;
      document.head.appendChild(styleTag);
    }

    // ── component ──────────────────────────────────────────────────────────

    function PeakOffPeakBadge(props) {
      var wide = props.wide === true;
      var statusState = React.useState(null);
      var status = statusState[0];
      var setStatus = statusState[1];

      React.useEffect(function () {
        var alive = true;
        var refresh = function () {
          try {
            var s = computeStatus();
            if (alive && s !== null) setStatus(s);
          } catch (error) {
            console.error("dsh-plugin-peak-pricing: status failed", error);
          }
        };
        refresh();
        var timer = setInterval(refresh, 30000);
        return function () {
          alive = false;
          clearInterval(timer);
        };
      }, []);

      var isPeak = status !== null && status.period === "peak";
      var cls = status === null ? "dsh-peak-neutral" : isPeak ? "dsh-peak-peak" : "dsh-peak-offpeak";
      var main = status === null ? "…" : isPeak ? "高峰时段 · 全价" : "空闲时段 · 半价";
      var next =
        status === null
          ? ""
          : formatCountdown(status.msUntilNext) + "后进入" + (status.nextPeriod === "peak" ? "高峰" : "空闲");
      var tip =
        status === null ? "峰谷时段加载中" : "北京时间 " + status.timeLabel + " · " + main + " · " + next;
      var rootCls = "dsh-peak-region " + (wide ? "dsh-peak-card" : "dsh-peak-rail") + " " + cls;

      if (!wide) {
        return React.createElement(
          "div",
          { className: rootCls },
          React.createElement(
            "div",
            { className: "dsh-peak-circle" },
            React.createElement("span", { className: "dsh-peak-dot" }),
          ),
          status !== null
            ? React.createElement(
                "div",
                { className: "dsh-peak-popup" },
                React.createElement("span", { className: "dsh-peak-dot" }),
                React.createElement(
                  "div",
                  { className: "dsh-peak-popup-main" },
                  main,
                  next !== "" ? React.createElement("span", { className: "dsh-peak-count" }, " · " + next) : null,
                ),
              )
            : null,
        );
      }
      return React.createElement(
        "div",
        { className: rootCls, title: tip },
        React.createElement("span", { className: "dsh-peak-dot" }),
        React.createElement(
          "span",
          { className: "dsh-peak-line" },
          main,
          next !== "" ? React.createElement("span", { className: "dsh-peak-count" }, " · " + next) : null,
        ),
      );
    }

    // ── plugin body ────────────────────────────────────────────────────────

    var pluginName = "dsh-plugin-peak-pricing";
    // slots 是硬依赖：不声明 inject 的话，fiber 会在 bundle 就绪后立即 apply，
    // 可能早于运行时挂载 slots，导致 UI 静默不注册。
    var inject = ["slots"];

    function apply(ctx) {
      var slots = ctx.get("slots");
      if (slots === undefined) return;
      slots.inject("sidebar.footer.action", () =>
        slots.register(
          {
            name: "sidebar.footer.action",
            id: "dsh-plugin-peak-pricing",
            order: 30,
            label: () => "DeepSeek 峰谷时段",
          },
          PeakOffPeakBadge,
        ),
      );
    }

    exports.apply = apply;
    exports.name = pluginName;
    exports.inject = inject;
    return module.exports;
  },
});
