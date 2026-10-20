// Client bundle smoke test: run the hand-written factory-CJS bundle in a VM,
// assert the 0.2.1 slot wiring, bilingual dictionary parity, peak/off-peak
// calculation, and the stable footer selectors that replaced the 0.1.x
// CSS-module hash.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const CLIENT_SOURCE = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const NS = "dsh-plugin-peak-pricing";

function translate(dict, key, params) {
  let text = dict[key] ?? key;
  if (params && typeof text === "string") {
    text = text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }
  return text;
}

function createHarness() {
  const registrations = [];
  const injections = [];
  const styles = [];
  const dictionary = { zh: null, en: null };
  let status = null;

  const React = {
    createElement(type, props) {
      return { type, props: props ?? {}, children: Array.prototype.slice.call(arguments, 2) };
    },
    useState() {
      return [status, () => {}];
    },
    useEffect() {},
  };

  const windowStub = {
    __ModuleLoader__: {
      load(config) {
        windowStub.config = config;
      },
    },
  };

  const documentStub = {
    documentElement: { dataset: {} },
    querySelector() {
      return null;
    },
    createElement() {
      return { dataset: {}, textContent: "" };
    },
    head: {
      appendChild(element) {
        styles.push(element);
      },
    },
    body: {},
  };

  const slots = {
    inject(name, fn) {
      injections.push(name);
      fn();
    },
    register(options, Component) {
      registrations.push({ options, Component });
      return () => {};
    },
  };

  const locale = {
    register(namespace, dict) {
      assert.equal(namespace, NS);
      dictionary.zh = dict.zh;
      dictionary.en = dict.en;
      return () => {};
    },
    bind() {
      return (key, params) => translate(dictionary.zh, key, params);
    },
  };

  const ctx = {
    get(name) {
      if (name === "slots") return slots;
      if (name === "locale") return locale;
      return undefined;
    },
    effect(fn) {
      const disposer = fn();
      return typeof disposer === "function" ? disposer : () => {};
    },
  };

  vm.runInNewContext(CLIENT_SOURCE, {
    window: windowStub,
    document: documentStub,
    console,
    setInterval,
    clearInterval,
  });

  const config = windowStub.config;
  assert.equal(config.id, NS, "factory id must match the package/entry name");
  const exports = config.factory((id) => {
    if (id === "react") return React;
    throw new Error("unexpected require: " + id);
  });

  return {
    config,
    exports,
    registrations,
    injections,
    styles,
    dictionary,
    setStatus(value) {
      status = value;
    },
  };
}

function beijing(y, monthIndex, day, hour, minute) {
  // computeStatus/periodAtTime consume "now" as a UTC epoch; Beijing is UTC+8.
  return Date.UTC(y, monthIndex, day, hour - 8, minute);
}

test("bundle factory id, name and 0.2.1 inject list", () => {
  const harness = createHarness();
  assert.equal(harness.config.id, NS);
  assert.equal(harness.exports.name, NS);
  assert.deepEqual(Array.from(harness.exports.inject), ["slots", "locale"]);
  assert.equal(typeof harness.exports.apply, "function");
});

test("apply registers the footer slot and locale dictionary", () => {
  const harness = createHarness();
  harness.exports.apply({
    get(name) {
      if (name === "slots") {
        return {
          inject(slot, fn) {
            harness.injections.push(slot);
            fn();
          },
          register(options, Component) {
            harness.registrations.push({ options, Component });
            return () => {};
          },
        };
      }
      if (name === "locale") {
        return {
          register(namespace, dict) {
            harness.dictionary.zh = dict.zh;
            harness.dictionary.en = dict.en;
            return () => {};
          },
          bind() {
            return (key, params) => translate(harness.dictionary.zh, key, params);
          },
        };
      }
      return undefined;
    },
    effect(fn) {
      fn();
    },
  });

  assert.deepEqual(harness.injections, ["sidebar.footer.action"]);
  assert.equal(harness.registrations.length, 1);
  const { options, Component } = harness.registrations[0];
  assert.equal(options.name, "sidebar.footer.action");
  assert.equal(options.locale, NS);
  assert.equal(typeof options.label, "function");
  assert.equal(Component.name, "PeakOffPeakBadge");
});

test("zh/en dictionaries have identical key sets and no nested error bag", () => {
  const harness = createHarness();
  const zh = Object.keys(harness.exports.DICT.zh).sort();
  const en = Object.keys(harness.exports.DICT.en).sort();
  assert.deepEqual(zh, en);
  assert.ok(zh.length > 0);
  for (const key of zh) {
    assert.equal(typeof harness.exports.DICT.zh[key], "string", "zh." + key);
    assert.equal(typeof harness.exports.DICT.en[key], "string", "en." + key);
  }
});

test("weekday peak windows and next transition", () => {
  const { computeStatus } = createHarness().exports;

  const peak = computeStatus(beijing(2026, 9, 20, 9, 0));
  assert.equal(peak.period, "peak");
  assert.equal(peak.nextPeriod, "offpeak");
  assert.equal(peak.timeLabel, "09:00");
  assert.equal(peak.msUntilNext, 3 * 60 * 60 * 1000);

  const noon = computeStatus(beijing(2026, 9, 20, 12, 0));
  assert.equal(noon.period, "offpeak");
  assert.equal(noon.nextPeriod, "peak");
  assert.equal(noon.msUntilNext, 2 * 60 * 60 * 1000);

  const almostPeak = computeStatus(beijing(2026, 9, 20, 13, 59));
  assert.equal(almostPeak.period, "offpeak");
  assert.equal(almostPeak.msUntilNext, 60 * 1000);

  const evening = computeStatus(beijing(2026, 9, 20, 18, 0));
  assert.equal(evening.period, "offpeak");
  assert.equal(evening.nextPeriod, "peak");
  assert.equal(evening.msUntilNext, 15 * 60 * 60 * 1000);
});

test("weekends are all-day off-peak from 2026-08-24", () => {
  const { computeStatus, periodAtTime } = createHarness().exports;

  // Saturday 2026-10-24 10:00 Beijing -> off-peak until Monday 09:00.
  const saturday = computeStatus(beijing(2026, 9, 24, 10, 0));
  assert.equal(saturday.period, "offpeak");
  assert.equal(saturday.nextPeriod, "peak");
  assert.equal(saturday.msUntilNext, 47 * 60 * 60 * 1000);

  // Friday 2026-10-23 19:00 -> the long weekend off-peak until Monday 09:00.
  const friday = computeStatus(beijing(2026, 9, 23, 19, 0));
  assert.equal(friday.period, "offpeak");
  assert.equal(friday.msUntilNext, 62 * 60 * 60 * 1000);

  // Before the policy took effect, Saturday still followed weekday windows.
  const oldSaturday = computeStatus(beijing(2026, 7, 22, 10, 0));
  assert.equal(oldSaturday.period, "peak");
  assert.equal(oldSaturday.msUntilNext, 2 * 60 * 60 * 1000);

  assert.equal(periodAtTime(beijing(2026, 9, 24, 10, 0) + 8 * 60 * 60 * 1000), "offpeak");
  assert.equal(periodAtTime(beijing(2026, 7, 22, 10, 0) + 8 * 60 * 60 * 1000), "peak");
});

test("footer CSS targets stable 0.2.x suffixes, not a build hash", () => {
  const harness = createHarness();
  assert.equal(harness.styles.length, 1);
  const css = harness.styles[0].textContent;
  assert.match(css, /\[class\*='footArea'\]/);
  assert.match(css, /\[class\*='collapsed'\]/);
  assert.match(css, /data-slot='sidebar\.footer\.action'/);
  assert.match(css, /data-platform='darwin'/);
  assert.match(css, /\.dsh-peak-card[^}]*border-radius: var\(--dsw-radius-md\)/);
  assert.match(css, /\.dsh-peak-card \{ left: -2px; right: -2px; \}/);
  assert.match(css, /\.dsh-peak-card[^}]*background: var\(--dsw-alias-button-elevated-fill\)/);
  assert.match(css, /\.dsh-peak-popup[^}]*background: var\(--dsw-alias-tooltip-bg\)/);
  assert.match(css, /\.dsh-peak-popup[^}]*color: var\(--dsw-static-neutral-bluish-00\)/);
  assert.match(css, /\.dsh-peak-popup \{[^}]*left: 56px; bottom: 14px;[^}]*padding: 3px 7px;/);
  assert.match(css, /\.dsh-peak-popup \{ left: 48px; bottom: 13px; \}/);
  assert.match(css, /\[data-sidebar-collapsed\] \.dsh-peak-region \{[^}]*width: 28px; height: 28px;/);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur/);
  assert.doesNotMatch(css, /hHd-Xa_/);
});

test("expanded badge renders period, countdown and accessible label", () => {
  const harness = createHarness();
  harness.exports.apply({
    get(name) {
      if (name === "slots") {
        return {
          inject(slot, fn) {
            fn();
          },
          register(options, Component) {
            harness.registrations.push({ options, Component });
            return () => {};
          },
        };
      }
      if (name === "locale") {
        return {
          register(namespace, dict) {
            harness.dictionary.zh = dict.zh;
            harness.dictionary.en = dict.en;
            return () => {};
          },
          bind() {
            return (key, params) => translate(harness.dictionary.zh, key, params);
          },
        };
      }
      return undefined;
    },
    effect(fn) {
      fn();
    },
  });

  harness.setStatus(harness.exports.computeStatus(beijing(2026, 9, 20, 9, 0)));
  const t = (key, params) => translate(harness.exports.DICT.zh, key, params);
  const tree = harness.registrations[0].Component({ t, wide: true });

  assert.equal(tree.type, "div");
  assert.match(tree.props.className, /dsh-peak-card/);
  assert.equal(tree.props["data-period"], "peak");
  assert.match(tree.props["aria-label"], /高峰时段/);
  assert.equal(tree.props.role, "status");

  const line = tree.children.find((child) => child && child.props && child.props.className === "dsh-peak-line");
  assert.ok(line, "wide badge must render the single-line label");
  assert.equal(line.children[0], "高峰时段 · 全价");
  const count = line.children.find((child) => child && child.props && child.props.className === "dsh-peak-count");
  assert.ok(count, "wide badge must render the countdown suffix");
  assert.match(count.children[0], /3小时/);
});

test("collapsed rail renders a dot and a hover popup", () => {
  const harness = createHarness();
  harness.exports.apply({
    get(name) {
      if (name === "slots") {
        return {
          inject(slot, fn) {
            fn();
          },
          register(options, Component) {
            harness.registrations.push({ options, Component });
            return () => {};
          },
        };
      }
      if (name === "locale") {
        return {
          register(namespace, dict) {
            harness.dictionary.zh = dict.zh;
            harness.dictionary.en = dict.en;
            return () => {};
          },
          bind() {
            return (key, params) => translate(harness.dictionary.zh, key, params);
          },
        };
      }
      return undefined;
    },
    effect(fn) {
      fn();
    },
  });

  harness.setStatus(harness.exports.computeStatus(beijing(2026, 9, 20, 13, 0)));
  const t = (key, params) => translate(harness.exports.DICT.zh, key, params);
  const tree = harness.registrations[0].Component({ t, wide: false });

  assert.match(tree.props.className, /dsh-peak-rail/);
  assert.match(tree.props.className, /dsh-peak-offpeak/);
  assert.equal(tree.props["data-period"], "offpeak");
  const circle = tree.children[0];
  assert.match(circle.props.className, /dsh-peak-circle/);
  const popup = tree.children[1];
  assert.match(popup.props.className, /dsh-peak-popup/);
  assert.match(popup.children[1].children[0], /空闲时段/);
});
