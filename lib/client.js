/**
 * dsh-plugin-peak-pricing client half: the browser bundle (factory-CJS, hand-written,
 * no build step).
 *
 * DeepSeek 峰谷定价时段（北京时间 UTC+8，无夏令时）：
 *   高峰时段 09:00-12:00、14:00-18:00；其余为空闲时段（半价）。
 *   自北京时间 2026-08-24 起，周六、周日全天为空闲时段（低谷），此前周末仍按上述规则。
 *
 * All user-visible strings go through the locale service (zh/en dictionaries
 * are registered under the dsh-plugin-peak-pricing namespace and live-switch
 * with Settings → General → Language).
 *
 * Registers one sidebar contribution in `sidebar.footer.action`:
 *   - 展开状态：设置按钮下方贴底的一条单行卡片（圆点 + 时段/价格 + 切换倒计时）
 *   - 收起状态：Web/Linux 轨道内 36px 圆形 hover；桌面 0 宽收起时 28px 浮动圆点，
 *     悬停弹出与 DSH 官方 Tooltip 同配色/尺寸的浮窗
 *
 * 位置实现：0.2.x 的侧边栏脚部仍是 `footArea > footerActions + settingsArea`，但
 * 类名是 CSS Module 的构建 hash（0.1.x 为 `hHd-Xa_*`，0.2.1 为 `_3WPZCG_*`）。因此
 * 这里按稳定的类名后缀（`footArea` / `collapsed`）和稳定的 `data-slot` 属性匹配，
 * 不再写死某个构建的 hash；`:has()` 规则只在徽章存在时生效，卸载后布局完全还原。
 *
 * Desktop（macOS / Windows）会把侧边栏整列收起到 0 宽；此时把圆点固定到视口左下角，
 * 让桌面端收起后仍能查看时段详情。Web / Linux 仍保留 56px 轨道，使用轨道内的定位。
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-peak-pricing",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");

    // ── i18n ───────────────────────────────────────────────────────────────

    var NS = "dsh-plugin-peak-pricing";

    var DICT = {
      zh: {
        nav: "DeepSeek 峰谷时段",
        loading: "…",
        peakMain: "高峰时段 · 全价",
        offpeakMain: "空闲时段 · 半价",
        countdownMinutes: "{m}分钟",
        countdownHours: "{h}小时",
        countdownHoursMinutes: "{h}小时{m}分",
        nextPeak: "{time}后进入高峰",
        nextOffpeak: "{time}后进入空闲",
        tipLoading: "峰谷时段加载中",
        tip: "北京时间 {time} · {main} · {next}",
      },
      en: {
        nav: "DeepSeek Peak/Off-Peak",
        loading: "…",
        peakMain: "Peak hours · Full price",
        offpeakMain: "Off-peak · 50% off",
        countdownMinutes: "{m}m",
        countdownHours: "{h}h",
        countdownHoursMinutes: "{h}h{m}m",
        nextPeak: "{time} until peak",
        nextOffpeak: "{time} until off-peak",
        tipLoading: "Loading peak/off-peak pricing",
        tip: "Beijing time {time} · {main} · {next}",
      },
    };

    function fallbackT(key, params) {
      var text = DICT.zh[key] ?? key;
      if (params) for (var k in params) text = text.replace("{" + k + "}", String(params[k]));
      return text;
    }

    // ── 峰谷时段计算（纯浏览器 Date）──────────────────────────────────────

    var BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
    var DAY_MS = 24 * 60 * 60 * 1000;

    // 工作日高峰边界：自北京时间零点起的分钟数（9:00 / 12:00 / 14:00 / 18:00）
    var PEAK_BOUNDARIES_MIN = [540, 720, 840, 1080];
    // 每天零点也是候选切换点（周末政策的生效与结束都发生在北京时间零点）
    var CANDIDATE_BOUNDARIES_MIN = [0].concat(PEAK_BOUNDARIES_MIN);

    // 自北京时间 2026-08-24（周一）起，周六、周日全天为空闲时段；此前周末仍按
    // 工作日规则。比较在“北京挂钟时间轴”上进行：now 加上 UTC+8 偏移后，北京零点
    // 恰好等于 Date.UTC(y, m, d)，getUTCDay/getUTCHours 读出的即北京墙钟。
    var WEEKEND_OFFPEAK_EPOCH = Date.UTC(2026, 7, 24);

    // 工作日规则：某分钟数（0-1439）属于哪个时段
    function intradayPeriodAt(minuteOfDay) {
      return (minuteOfDay >= 540 && minuteOfDay < 720) || (minuteOfDay >= 840 && minuteOfDay < 1080)
        ? "peak"
        : "offpeak";
    }

    // 北京挂钟时间轴上某一时刻属于哪个时段（含周末全天空闲政策）。
    // 参数是“已加 UTC+8 偏移”的 shifted ms；测试注入 epoch 时需自行加 BJ_OFFSET_MS。
    function periodAtTime(shiftedMs) {
      var dayStart = Math.floor(shiftedMs / DAY_MS) * DAY_MS;
      var weekday = new Date(dayStart).getUTCDay(); // 0=周日 … 6=周六
      if (dayStart >= WEEKEND_OFFPEAK_EPOCH && (weekday === 0 || weekday === 6)) return "offpeak";
      return intradayPeriodAt(Math.floor((shiftedMs - dayStart) / 60000));
    }

    // 在当前时刻之后寻找下一个“时段发生变化”的边界。周末全天空闲后，最长的一段
    // 连续空闲从周五 18:00 起持续到下周一 9:00（约 63 小时），因此扫描范围必须
    // 覆盖未来一周，而不是只看今天和明天。
    function findNextTransition(shiftedNow, period) {
      var startDay = Math.floor(shiftedNow / DAY_MS);
      for (var day = 0; day < 8; day++) {
        var dayStart = (startDay + day) * DAY_MS;
        for (var i = 0; i < CANDIDATE_BOUNDARIES_MIN.length; i++) {
          var candidate = dayStart + CANDIDATE_BOUNDARIES_MIN[i] * 60000;
          if (candidate <= shiftedNow) continue;
          var candidatePeriod = periodAtTime(candidate);
          if (candidatePeriod !== period) return { time: candidate, period: candidatePeriod };
        }
      }
      return null;
    }

    // nowMs 仅用于测试注入；省略时取当前时间。
    function computeStatus(nowMs) {
      var shiftedNow = (nowMs === undefined ? Date.now() : nowMs) + BJ_OFFSET_MS;
      var wallClock = new Date(shiftedNow);
      var h = wallClock.getUTCHours();
      var m = wallClock.getUTCMinutes();
      var period = periodAtTime(shiftedNow);
      var transition = findNextTransition(shiftedNow, period);
      // 一周内必有峰谷切换；保留保底值，避免极端情况下文案为空。
      var nextBoundary = transition !== null ? transition.time : shiftedNow + DAY_MS;
      var nextPeriod =
        transition !== null ? transition.period : period === "peak" ? "offpeak" : "peak";
      var pad = function (n) {
        return (n < 10 ? "0" : "") + n;
      };
      return {
        period: period,
        nextPeriod: nextPeriod,
        msUntilNext: nextBoundary - shiftedNow,
        timeLabel: pad(h) + ":" + pad(m),
      };
    }

    function formatCountdown(ms, t) {
      var totalMin = Math.round(ms / 60000);
      var h = Math.floor(totalMin / 60);
      var m = totalMin % 60;
      if (h <= 0) return t("countdownMinutes", { m: m });
      if (m > 0) return t("countdownHoursMinutes", { h: h, m: m });
      return t("countdownHours", { h: h });
    }

    // ── styles ─────────────────────────────────────────────────────────────

    var css = [
      "/* 仅当本徽章存在时：为脚部预留紧凑的底部空间，并把徽章定位到设置按钮下方。",
      "   0.2.x 的类名带构建 hash，因此匹配稳定的类名后缀，而不是写死某个 hash。 */",
      "[class*='footArea']:has(.dsh-peak-region) { position: relative; padding-bottom: 37px; }",
      "[class*='footArea']:has(.dsh-peak-region) .dsh-peak-region { position: absolute; left: 0; right: 0; bottom: 3px; height: 32px; }",
      "/* 侧边栏列表/设置行（如 session row）的背景比内容区左右各外扩约 2px；",
      "   徽章跟随同一宽度和 radius-md，避免看起来比上方卡片窄一圈。 */",
      "[class*='footArea']:has(.dsh-peak-region) .dsh-peak-card { left: -2px; right: -2px; }",
      "/* 收起状态：预留更高空间，容纳 36px 圆形 hover，与设置按钮一致 */",
      "[class*='collapsed'] [class*='footArea']:has(.dsh-peak-region) { padding-bottom: 41px; }",
      "[class*='collapsed'] [class*='footArea']:has(.dsh-peak-region) .dsh-peak-region { height: 36px; }",
      "/* Desktop 收起后侧边栏宽度为 0：把圆点固定到视口左下角；仅隐藏脚部里的其它条目，",
      "   避免 wallet 等共享 sidebar.footer.action 的插件在 0 宽列里留下残影。 */",
      "html[data-platform='darwin'] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region),",
      "html[data-windows-titlebar] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region) { display: block; padding-bottom: 0; }",
      "html[data-platform='darwin'] [data-sidebar-collapsed] [data-slot='sidebar.footer.action'] > :not(.dsh-peak-region),",
      "html[data-windows-titlebar] [data-sidebar-collapsed] [data-slot='sidebar.footer.action'] > :not(.dsh-peak-region) { display: none; }",
      "html[data-platform='darwin'] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region) > [class*='footerActions'],",
      "html[data-windows-titlebar] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region) > [class*='footerActions'] { display: contents; }",
      "html[data-platform='darwin'] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region) > [class*='settingsArea'],",
      "html[data-windows-titlebar] [data-sidebar-collapsed] [class*='footArea']:has(.dsh-peak-region) > [class*='settingsArea'] { display: none; }",
      "html[data-platform='darwin'] [data-sidebar-collapsed] .dsh-peak-region,",
      "html[data-windows-titlebar] [data-sidebar-collapsed] .dsh-peak-region { position: fixed; left: 12px; right: auto; bottom: 12px; width: 28px; height: 28px; z-index: 30; }",
      "html[data-platform='darwin'] [data-sidebar-collapsed] .dsh-peak-circle,",
      "html[data-windows-titlebar] [data-sidebar-collapsed] .dsh-peak-circle { width: 28px; height: 28px; }",
      "/* 桌面端实际截图中 28px 圆点的 hover 视觉中心比几何中心低 4px（外层仍按 36px 槽位排布）；",
      "   tooltip 用 bottom 17px 对齐视觉中心，left 48px 保持 8px 间距。 */",
      "html[data-platform='darwin'] [data-sidebar-collapsed] .dsh-peak-popup,",
      "html[data-windows-titlebar] [data-sidebar-collapsed] .dsh-peak-popup { left: 48px; bottom: 17px; }",
      ".dsh-peak-region { box-sizing: border-box; display: flex; align-items: center; min-width: 0; }",
      ".dsh-peak-card { justify-content: flex-start; gap: 6px; padding: 6px 8px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-button-elevated-fill); border: .5px solid var(--dsw-alias-border-l3); font-size: 12px; line-height: 18px; cursor: default; white-space: nowrap; overflow: hidden; }",
      ".dsh-peak-rail { justify-content: center; }",
      ".dsh-peak-circle { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: transparent; border: none; padding: 0; cursor: pointer; font: inherit; }",
      ".dsh-peak-circle:hover { background: var(--dsw-alias-interactive-bg-hover); }",
      "/* 收起状态下圆点固定在视口左下角，浮窗用纯 CSS 固定坐标锚定 */",
      "/* 与 DSH 官方 Tooltip 同一套 token/字号：tooltip-bg、白字、radius-sm、13/20。 */",
      ".dsh-peak-popup { position: fixed; left: 56px; bottom: 14px; z-index: 40; display: flex; align-items: center; gap: 8px; padding: 3px 7px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-tooltip-bg); color: var(--dsw-static-neutral-bluish-00); border: 0; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; font-size: 13px; line-height: 20px; white-space: nowrap; }",
      "/* hover 显示：圆点区域或浮窗本身被指向时可见，移开即隐藏 */",
      ".dsh-peak-popup { visibility: hidden; opacity: 0; transition: opacity 0.12s ease, visibility 0.12s; }",
      ".dsh-peak-region:hover .dsh-peak-popup, .dsh-peak-popup:hover { visibility: visible; opacity: 1; }",
      ".dsh-peak-popup .dsh-peak-dot { width: 10px; height: 10px; }",
      ".dsh-peak-popup-main { color: inherit; font-weight: 400; }",
      ".dsh-peak-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }",
      ".dsh-peak-rail .dsh-peak-dot { width: 10px; height: 10px; }",
      ".dsh-peak-peak .dsh-peak-dot { background: var(--dsw-alias-state-warn-primary); }",
      ".dsh-peak-offpeak .dsh-peak-dot { background: var(--dsw-alias-state-success-primary); }",
      ".dsh-peak-neutral .dsh-peak-dot { background: var(--dsw-alias-label-secondary); }",
      ".dsh-peak-line { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--dsw-alias-label-primary); font-weight: 500; }",
      ".dsh-peak-count { color: var(--dsw-alias-label-secondary); font-weight: 400; }",
      ".dsh-peak-popup .dsh-peak-count { color: var(--dsw-static-neutral-bluish-300); }",
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
      var t = typeof props.t === "function" ? props.t : fallbackT;
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
      var main = status === null ? t("loading") : isPeak ? t("peakMain") : t("offpeakMain");
      var next =
        status === null
          ? ""
          : t(status.nextPeriod === "peak" ? "nextPeak" : "nextOffpeak", {
              time: formatCountdown(status.msUntilNext, t),
            });
      var tip =
        status === null ? t("tipLoading") : t("tip", { time: status.timeLabel, main: main, next: next });
      var rootCls = "dsh-peak-region " + (wide ? "dsh-peak-card" : "dsh-peak-rail") + " " + cls;
      var rootProps = {
        className: rootCls,
        role: "status",
        "aria-label": tip,
        "data-period": status === null ? "loading" : isPeak ? "peak" : "offpeak",
      };

      if (!wide) {
        return React.createElement(
          "div",
          rootProps,
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
        Object.assign({ title: tip }, rootProps),
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
    // 可能早于运行时挂载 slots，导致 UI 静默不注册。locale 用于随 harness
    // 配置切换中英文文案。
    var inject = ["slots", "locale"];

    function apply(ctx) {
      var locale = ctx.get("locale");
      var t = locale && typeof locale.bind === "function" ? locale.bind(NS) : fallbackT;

      if (locale && typeof locale.register === "function") {
        ctx.effect(function () {
          return locale.register(NS, { zh: DICT.zh, en: DICT.en });
        }, NS + ": dictionaries");
      }

      var slots = ctx.get("slots");
      if (slots === undefined) return;
      slots.inject("sidebar.footer.action", () =>
        slots.register(
          {
            name: "sidebar.footer.action",
            id: "dsh-plugin-peak-pricing",
            order: 30,
            locale: NS,
            label: () => t("nav"),
          },
          PeakOffPeakBadge,
        ),
      );
    }

    exports.apply = apply;
    exports.name = pluginName;
    exports.inject = inject;
    exports.DICT = DICT;
    // 纯函数导出仅供 node 侧测试；loader 只消费 name/inject/apply。
    exports.computeStatus = computeStatus;
    exports.periodAtTime = periodAtTime;
    return module.exports;
  },
});
