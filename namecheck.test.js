// Regression tests for results-page trial CTA click analytics.
// They load namecheck.js in jsdom with fetch and GoatCounter stubbed.
// No name-check API, web3forms, Stripe, Google Ads, or GoatCounter requests.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const SCRIPT = fs.readFileSync(new URL("./namecheck.js", import.meta.url), "utf8");
const MONTHLY = "https://buy.stripe.com/3cIbJ2gqK0am6SP3ECbo400";
const YEARLY = "https://buy.stripe.com/3cIcN6b6qf5gb956QObo401";
const PORTFOLIO = "https://buy.stripe.com/28E3cwa2m4qC1yv0sqbo403";
const BRAND = "ZZQXBRAND99";
const EMAIL = "not-a-real-lead@example.test";
function checkout(base) { return base + "?prefilled_email=" + encodeURIComponent(EMAIL); }
const SERIAL = "SN9XQ17";
const PROOF = "Searches over 4 million live U.S. federal trademarks, refreshed every day from the USPTO. No signup to see how many come up.";

function officialBind(window) {
  window.goatcounter.bind_events = function () {
    Array.prototype.forEach.call(window.document.querySelectorAll("*[data-goatcounter-click]"), function (elem) {
      if (elem.dataset.goatcounterBound) return;
      var send = function () {
        window.goatcounter.count({
          event: true,
          path: elem.dataset.goatcounterClick || "",
          title: elem.dataset.goatcounterTitle || elem.title || String(elem.innerHTML || "").substr(0, 200),
        });
      };
      elem.addEventListener("click", send, false);
      elem.addEventListener("auxclick", send, false);
      elem.dataset.goatcounterBound = "true";
    });
  };
}

function harness(options = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <form data-namecheck data-source="name-check" data-plans="index.html#pricing">
      <input name="name" maxlength="60" required>
      <input name="email" type="email">
      <input name="botcheck" type="checkbox">
      <label class="nc-tips" hidden><input type="checkbox" name="tips" value="yes"></label>
      <button type="submit">Check my name</button>
    </form>
    <div data-results></div>
    <a id="static-monthly" href="${MONTHLY}" data-goatcounter-click="checkout-monthly">Start 7-day free trial</a>
  </body></html>`, {
    url: "https://clashowl.com/free-name-check.html?capture=0",
    runScripts: "dangerously",
  });
  const { window } = dom;
  const events = [];
  const fetches = [];
  const nav = [];
  const timers = [];
  if (options.manualTimers) {
    window.setInterval = function (fn) {
      const item = { fn: fn, cleared: false, unref: function () {} };
      timers.push(item);
      return item;
    };
    window.clearInterval = function (item) { if (item) item.cleared = true; };
  }
  if (options.goatcounter !== false) {
    window.goatcounter = {
      count: function (vars) { events.push(Object.assign({}, vars)); },
    };
    if (options.countThrows) {
      window.goatcounter.count = function () { throw new Error("analytics blocked"); };
    }
    officialBind(window);
    if (options.bindAtLoad !== false) window.goatcounter.bind_events();
  }
  window.fetch = async function (url, opts) {
    const u = String(url);
    fetches.push(u);
    if (/web3forms|stripe|goatcounter|google|gtag/i.test(u)) throw new Error("unexpected external request");
    const body = JSON.parse(opts.body);
    let payload;
    if (!body.unlock) {
      const count = options.previewCount || 0;
      const sound = options.previewSound || 0;
      payload = { count: count, total: 4000000, counts: { sound_only: sound } };
    } else if (options.outcome === "match") {
      payload = {
        count: 1,
        total: 4000000,
        counts: { sound_only: 0 },
        matches: [{ mark: "OTHERMARK", serial: SERIAL, why: ["looks alike"], filing_date: "2024-06-01", classes: ["25"], status: "Pending" }],
        sound_alikes: [],
      };
    } else if (options.outcome === "sound") {
      payload = {
        count: 0,
        total: 4000000,
        counts: { sound_only: 1 },
        matches: [],
        sound_alikes: [{ mark: "SOUNDMARK", serial: "SND123" }],
      };
    } else {
      payload = { count: 0, total: 4000000, counts: { sound_only: 0 }, matches: [], sound_alikes: [] };
    }
    return { ok: true, json: async function () { return payload; } };
  };
  function stopNav(ev) {
    const t = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (!t) return;
    nav.push({ href: t.getAttribute("href"), defaultPrevented: ev.defaultPrevented });
    ev.preventDefault();
  }
  window.document.addEventListener("click", stopNav, false);
  window.document.addEventListener("auxclick", stopNav, false);
  window.eval(SCRIPT);
  return { window: window, events: events, fetches: fetches, nav: nav, timers: timers, dom: dom };
}

function waitFor(fn, ms) {
  const start = Date.now();
  return new Promise(function (resolve, reject) {
    (function tick() {
      let value;
      try { value = fn(); } catch (err) { reject(err); return; }
      if (value) { resolve(value); return; }
      if (Date.now() - start > (ms || 1000)) { reject(new Error("timed out")); return; }
      setTimeout(tick, 10);
    })();
  });
}

function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

function click(window, el, type) {
  const ev = new window.MouseEvent(type || "click", {
    bubbles: true,
    cancelable: true,
    button: type === "auxclick" ? 1 : 0,
  });
  el.dispatchEvent(ev);
  return ev;
}

function paths(events) { return events.map(function (e) { return e.path; }); }
function countPath(events, path) {
  return events.filter(function (e) { return e.path === path; }).length;
}
function assertNoPrivateData(events) {
  const blob = JSON.stringify(events);
  assert.equal(blob.includes(BRAND), false);
  assert.equal(blob.includes(EMAIL), false);
  assert.equal(blob.includes(SERIAL), false);
  assert.equal(blob.includes("OTHERMARK"), false);
  assert.equal(blob.includes("SOUNDMARK"), false);
}
function assertStillNavigates(h, href) {
  const last = h.nav[h.nav.length - 1];
  assert.ok(last, "click did not reach the link");
  assert.equal(last.href, href);
  assert.equal(last.defaultPrevented, false);
}

async function preview(h) {
  const form = h.window.document.querySelector("form");
  form.elements.name.value = h.brand || BRAND;
  form.requestSubmit();
  await waitFor(function () { return h.window.document.querySelector("[data-results] .nc-box"); });
  return form;
}

async function unlock(h) {
  const form = await preview(h);
  form.elements.email.value = EMAIL;
  form.requestSubmit();
  await waitFor(function () { return h.window.document.querySelector("a[data-goatcounter-click='nc-trial']"); });
  return h.window.document.querySelector("a[data-goatcounter-click='nc-trial']");
}

test("a brand with spaces stays on the button and out of the Stripe URL", async function () {
  const h = harness({ outcome: "clean" });
  h.brand = "North Loom 2";
  try {
    const a = await unlock(h);
    assert.equal(a.textContent, "Watch North Loom 2 free for 7 days");
    const params = new URL(a.getAttribute("href")).searchParams;
    assert.deepEqual(Array.from(params.keys()), ["prefilled_email"]);
    assert.equal(a.getAttribute("href").includes("North"), false);
    assert.equal(a.getAttribute("href").includes("client_reference_id"), false);
    click(h.window, a);
    assert.equal(JSON.stringify(h.events).includes("North"), false);
    assert.equal(JSON.stringify(h.events).includes(EMAIL), false);
    assert.equal(countPath(h.events, "nc-trial"), 1);
    assert.equal(countPath(h.events, "trial_started"), 1);
  } finally { h.window.close(); }
});

test("proof line on the free name check page stays in place", function () {
  const html = fs.readFileSync(new URL("./free-name-check.html", import.meta.url), "utf8");
  assert.equal(html.includes('data-test="fnc-proof">' + PROOF), true);
});

test("static pricing checkout tracking is unchanged and is not nc-trial", function () {
  const h = harness();
  try {
    const a = h.window.document.getElementById("static-monthly");
    assert.equal(a.dataset.goatcounterBound, "true");
    click(h.window, a);
    assert.equal(countPath(h.events, "checkout-monthly"), 1);
    assert.equal(h.events.find(function (e) { return e.path === "checkout-monthly"; }).title, "Start 7-day free trial");
    assert.equal(countPath(h.events, "trial_started"), 1);
    assert.equal(countPath(h.events, "trial_started-monthly"), 1);
    assert.equal(countPath(h.events, "nc-trial"), 0);
    assertStillNavigates(h, MONTHLY);
    assertNoPrivateData(h.events);
  } finally { h.window.close(); }
});

test("clean result: one primary click records nc-trial once and still navigates", async function () {
  const h = harness({ outcome: "clean" });
  try {
    const a = await unlock(h);
    assert.equal(a.getAttribute("href"), checkout(MONTHLY));
    assert.deepEqual(Array.from(new URL(a.getAttribute("href")).searchParams.keys()), ["prefilled_email"]);
    assert.equal(new URL(a.getAttribute("href")).searchParams.get("prefilled_email"), EMAIL);
    assert.equal(a.getAttribute("href").includes(BRAND), false);
    assert.equal(a.getAttribute("href").includes("client_reference_id"), false);
    assert.equal(a.textContent, "Watch " + BRAND + " free for 7 days");
    assert.equal(a.dataset.goatcounterBound, "true");
    const results = h.window.document.querySelector("[data-results]");
    assert.match(results.textContent, /No close matches/);
    assert.match(results.textContent, /one-time search of the records we just looked at/);
    assert.match(results.textContent, /does not cover applications filed after today/);
    assert.equal(/4\.5|per week|weekly filing/i.test(results.textContent), false);
    assert.match(results.textContent, /\$15\/month after 7 free days/);
    assert.match(results.textContent, /\$149\/year/);
    assert.match(results.textContent, /\$49\/month for up to 50 brands/);
    h.window.goatcounter.bind_events();
    const before = h.events.length;
    click(h.window, a);
    const added = paths(h.events.slice(before));
    assert.deepEqual(added, ["trial_started", "trial_started-monthly", "nc-trial"]);
    assert.equal(h.events.filter(function (e) { return e.path === "nc-trial"; })[0].title, "nc-trial");
    assert.equal(h.events.filter(function (e) { return e.path === "nc-trial"; })[0].event, true);
    assertStillNavigates(h, checkout(MONTHLY));
    assertNoPrivateData(h.events);
    assert.equal(JSON.stringify(h.events).includes(EMAIL), false);
    assert.equal(h.fetches.some(function (u) { return /web3forms|stripe|goatcounter|google/i.test(u); }), false);
  } finally { h.window.close(); }
});

test("clean result: yearly, portfolio, plans, and USPTO clicks do not double-count", async function () {
  const h = harness({ outcome: "clean" });
  try {
    await unlock(h);
    const doc = h.window.document;
    h.window.goatcounter.bind_events();
    function added(el) {
      const before = h.events.length;
      click(h.window, el);
      return paths(h.events.slice(before));
    }
    const yearly = doc.querySelector("[data-goatcounter-click='nc-yearly']");
    const portfolio = doc.querySelector("[data-goatcounter-click='nc-portfolio']");
    assert.equal(yearly.getAttribute("href"), checkout(YEARLY));
    assert.equal(portfolio.getAttribute("href"), checkout(PORTFOLIO));
    assert.equal(yearly.getAttribute("href").includes(BRAND), false);
    assert.deepEqual(added(yearly), ["trial_started", "trial_started-yearly", "nc-yearly"]);
    assert.deepEqual(added(portfolio), ["trial_started", "trial_started-portfolio", "nc-portfolio"]);
    assert.deepEqual(added(doc.querySelector("[data-results] a[href='index.html#pricing']")), []);
    const uspto = doc.querySelector("[data-goatcounter-click='nc-uspto-full']");
    assert.equal(uspto.dataset.goatcounterBound, "true");
    assert.deepEqual(added(uspto), []);
    assert.equal(countPath(h.events, "nc-trial"), 0);
    assertNoPrivateData(h.events);
    assert.equal(h.nav[h.nav.length - 1].defaultPrevented, false);
  } finally { h.window.close(); }
});

test("similar-match result records one nc-trial from the button or a child", async function () {
  const h = harness({ outcome: "match" });
  try {
    const a = await unlock(h);
    const results = h.window.document.querySelector("[data-results]");
    assert.match(results.textContent, /OTHERMARK/);
    assert.match(results.textContent, new RegExp(SERIAL));
    assert.match(results.textContent, /We found 1 live filing/);
    assert.match(results.textContent, /New filings keep coming/);
    assert.equal(a.getAttribute("href"), checkout(MONTHLY));
    assert.equal(a.textContent, "Watch " + BRAND + " free for 7 days");
    const span = h.window.document.createElement("span");
    span.textContent = "inner";
    a.appendChild(span);
    h.window.goatcounter.bind_events();
    const before = h.events.length;
    click(h.window, span);
    assert.deepEqual(paths(h.events.slice(before)), ["trial_started", "trial_started-monthly", "nc-trial"]);
    const text = a.firstChild;
    click(h.window, text);
    assert.equal(countPath(h.events, "nc-trial"), 2);
    assert.equal(countPath(h.events, "trial_started"), 2);
    assertNoPrivateData(h.events);
    assertStillNavigates(h, checkout(MONTHLY));
  } finally { h.window.close(); }
});

test("sound-alike no-lookalike result uses the same trial click metric", async function () {
  const h = harness({ outcome: "sound" });
  try {
    const a = await unlock(h);
    const results = h.window.document.querySelector("[data-results]");
    assert.match(results.textContent, /sounds similar/);
    assert.match(results.textContent, /does not cover applications filed after today/);
    assert.equal(a.getAttribute("href"), checkout(MONTHLY));
    h.window.goatcounter.bind_events();
    click(h.window, a);
    assert.equal(countPath(h.events, "nc-trial"), 1);
    assert.equal(countPath(h.events, "trial_started"), 1);
    assertNoPrivateData(h.events);
  } finally { h.window.close(); }
});

test("rerender and a repeated check bind the new link once", async function () {
  const h = harness({ outcome: "match" });
  try {
    const first = await unlock(h);
    h.window.goatcounter.bind_events();
    click(h.window, first);
    assert.equal(countPath(h.events, "nc-trial"), 1);
    const form = h.window.document.querySelector("form");
    form.requestSubmit();
    const second = await waitFor(function () {
      const link = h.window.document.querySelector("a[data-goatcounter-click='nc-trial']");
      return link && link !== first ? link : null;
    });
    assert.equal(second.dataset.goatcounterBound, "true");
    assert.equal(second.isConnected, true);
    assert.equal(first.isConnected, false);
    click(h.window, first);
    assert.equal(countPath(h.events, "nc-trial"), 1);
    h.window.goatcounter.bind_events();
    click(h.window, second);
    assert.equal(countPath(h.events, "nc-trial"), 2);
    assert.equal(countPath(h.events, "trial_started"), 2);
    assert.equal(second.textContent, "Watch " + BRAND + " free for 7 days");
    assert.equal(second.getAttribute("href"), checkout(MONTHLY));
    assertNoPrivateData(h.events);
  } finally { h.window.close(); }
});

test("preview watch click stays on trial_started and does not emit nc-watch-preview", async function () {
  const h = harness({ previewCount: 2 });
  try {
    await preview(h);
    const w = h.window.document.querySelector("[data-goatcounter-click='nc-watch-preview']");
    assert.equal(w.dataset.goatcounterBound, "true");
    assert.equal(w.getAttribute("href"), MONTHLY);
    assert.equal(w.getAttribute("href").includes("prefilled_email"), false);
    assert.equal(w.textContent, "Watch " + BRAND + " free for 7 days");
    h.window.goatcounter.bind_events();
    const before = h.events.length;
    click(h.window, w);
    assert.deepEqual(paths(h.events.slice(before)), ["trial_started", "trial_started-monthly"]);
    assert.equal(countPath(h.events, "nc-trial"), 0);
    assert.equal(countPath(h.events, "nc-watch-preview"), 0);
    assertNoPrivateData(h.events);
    assertStillNavigates(h, MONTHLY);
  } finally { h.window.close(); }
});

test("a click before GoatCounter loads is sent once when it arrives", async function () {
  const h = harness({ goatcounter: false, outcome: "clean" });
  try {
    const a = await unlock(h);
    assert.equal(a.dataset.goatcounterBound, "true");
    click(h.window, a);
    assert.equal(h.events.length, 0);
    h.window.goatcounter = { count: function (vars) { h.events.push(Object.assign({}, vars)); } };
    officialBind(h.window);
    h.window.goatcounter.bind_events();
    await waitFor(function () { return countPath(h.events, "nc-trial") === 1; }, 1500);
    assert.deepEqual(paths(h.events), ["trial_started", "trial_started-monthly", "nc-trial"]);
    assert.equal(h.events[2].title, "nc-trial");
    assertNoPrivateData(h.events);
    click(h.window, a);
    assert.equal(countPath(h.events, "nc-trial"), 2);
    assert.equal(countPath(h.events, "trial_started"), 2);
    assert.equal(countPath(h.events, "trial_started-monthly"), 2);
    assertStillNavigates(h, checkout(MONTHLY));
  } finally { h.window.close(); }
});

test("queued clicks are dropped if GoatCounter never arrives, and the link still works", async function () {
  const h = harness({ goatcounter: false, outcome: "match", manualTimers: true });
  try {
    const a = await unlock(h);
    click(h.window, a);
    assert.equal(h.timers.length, 1);
    for (let i = 0; i < 50; i++) h.timers[0].fn();
    assert.equal(h.timers[0].cleared, true);
    const sink = [];
    h.window.goatcounter = { count: function (vars) { sink.push(vars.path); } };
    officialBind(h.window);
    h.window.goatcounter.bind_events();
    assert.deepEqual(sink, []);
    click(h.window, a);
    assert.deepEqual(sink, ["trial_started", "trial_started-monthly", "nc-trial"]);
    assert.equal(JSON.stringify(sink).includes(BRAND), false);
    assert.equal(JSON.stringify(sink).includes(EMAIL), false);
    assertStillNavigates(h, checkout(MONTHLY));
    assert.equal(h.fetches.some(function (u) { return /web3forms|stripe|goatcounter/i.test(u); }), false);
  } finally { h.window.close(); }
});

test("a throwing analytics call does not block navigation", async function () {
  const h = harness({ outcome: "clean", countThrows: true });
  try {
    const a = await unlock(h);
    assert.doesNotThrow(function () { click(h.window, a); });
    assert.equal(a.getAttribute("href"), checkout(MONTHLY));
    assertStillNavigates(h, checkout(MONTHLY));
    assert.equal(a.textContent, "Watch " + BRAND + " free for 7 days");
  } finally { h.window.close(); }
});

test("middle-click counts nc-trial once and does not also emit trial_started", async function () {
  const h = harness({ outcome: "clean" });
  try {
    const a = await unlock(h);
    const before = h.events.length;
    click(h.window, a, "auxclick");
    assert.deepEqual(paths(h.events.slice(before)), ["nc-trial"]);
    assertStillNavigates(h, checkout(MONTHLY));
  } finally { h.window.close(); }
});
