// ClashOwl free name check. Used by the homepage hero and free-name-check.html.
// Markup: <form data-namecheck data-source="..." data-plans="#pricing"> with inputs name, email (starts hidden), botcheck, a submit button, and a [data-results] element after it.
// Two steps: name only -> preview count (no email, no signup). Email -> full matches, USPTO links, trial CTA (signup captured here only).
(function () {
  var API = window.NC_API || "https://clashowl-namecheck.clashowl.workers.dev/api/check";
  var MONTHLY = "https://buy.stripe.com/3cIbJ2gqK0am6SP3ECbo400", YEARLY = "https://buy.stripe.com/3cIcN6b6qf5gb956QObo401", PORTFOLIO = "https://buy.stripe.com/28E3cwa2m4qC1yv0sqbo403";
  var q = new URLSearchParams(location.search), CAPTURE = q.get("capture") !== "0"; // add ?capture=0 when testing so no signups are created
  // Click metrics only. None of these is a completed Stripe signup.
  // GoatCounter binds [data-goatcounter-click] once, at load. Result links are
  // injected later, so that bind never sees them. nc-trial / nc-yearly /
  // nc-portfolio are results-page trial CTA clicks. trial_started is any Stripe
  // checkout link click on pages that load this script (plan in a second event).
  // One results click emits both names once each; do not add them together.
  // Titles are the event name only, never the link text (it contains the brand).
  var RESULT_TRIAL = {"nc-trial": 1, "nc-yearly": 1, "nc-portfolio": 1};
  var GC_QUEUE = [], GC_WATCH = null, armedResults = [];
  function gcSend(n) { window.goatcounter.count({path: n, title: n, event: true}); }
  function gcQueued(n) { return RESULT_TRIAL[n] || n.indexOf("trial_started") === 0; }
  function gcFlush() {
    if (!window.goatcounter || typeof window.goatcounter.count !== "function") return;
    var batch = GC_QUEUE.splice(0, GC_QUEUE.length);
    for (var i = 0; i < batch.length; i++) { try { gcSend(batch[i]); } catch (e) {} }
  }
  function gcWatch() {
    if (GC_WATCH) return;
    var tries = 0;
    GC_WATCH = setInterval(function () {
      tries++;
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        clearInterval(GC_WATCH); GC_WATCH = null; gcFlush();
      } else if (tries >= 50) { clearInterval(GC_WATCH); GC_WATCH = null; GC_QUEUE.length = 0; }
    }, 200);
    if (GC_WATCH.unref) GC_WATCH.unref();
  }
  function gc1(n) {
    try {
      if (window.goatcounter && typeof window.goatcounter.count === "function") { gcSend(n); return; }
    } catch (e) { return; }
    if (!gcQueued(n) || GC_QUEUE.length >= 30) return;
    GC_QUEUE.push(n); gcWatch();
  }
  var ALIAS = {"nc-check-start": "free_check_started", "nc-check-done": "free_check_completed", "nc-email-capture": "email_captured"};
  function gc(n) { gc1(n); if (ALIAS[n]) gc1(ALIAS[n]); }
  function clickEl(ev) {
    var t = ev && ev.target;
    if (!t) return null;
    if (t.nodeType === 3) t = t.parentElement;
    return t && t.closest ? t : null;
  }
  document.addEventListener("click", function (ev) {
    var t = clickEl(ev); if (!t) return;
    var a = t.closest('a[href^="https://buy.stripe.com/"]'); if (!a) return;
    var h = a.getAttribute("href"), plan = h === YEARLY ? "yearly" : h === PORTFOLIO ? "portfolio" : "monthly";
    gc1("trial_started"); gc1("trial_started-" + plan);
  }, true);
  function armResultTrialClicks(r) {
    if (!r || !r.addEventListener) return;
    for (var i = 0; i < armedResults.length; i++) if (armedResults[i] === r) return;
    armedResults.push(r);
    function onClick(ev) {
      var t = clickEl(ev); if (!t) return;
      var a = t.closest("a[data-goatcounter-click]");
      if (!a || (r.contains && !r.contains(a))) return;
      var name = a.getAttribute("data-goatcounter-click");
      if (!RESULT_TRIAL[name]) return;
      gc1(name);
    }
    r.addEventListener("click", onClick, true);
    r.addEventListener("auxclick", onClick, true);
  }
  // Mark every dynamic results click target as already bound so a late
  // goatcounter.bind_events() cannot send a second hit whose title is the
  // link HTML. Only the results trial CTAs are counted, just above.
  function sealDynamicClicks(root) {
    if (!root || !root.querySelectorAll) return;
    var links = root.querySelectorAll("a[data-goatcounter-click]");
    for (var i = 0; i < links.length; i++) links[i].dataset.goatcounterBound = "true";
  }
  function adsLead() {
    try {
      if (typeof gtag === "function") {
        gtag("event", "conversion", {
          send_to: "AW-18550832284/GoADCM-PpbAdEJz53I1F",
          value: 1.0,
          currency: "USD"
        });
      }
    } catch (e) {}
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function uspto(n) { return '<p><a class="btn" href="https://tmsearch.uspto.gov/search/search-results?query=' + encodeURIComponent(n) + '" target="_blank" rel="noopener" data-goatcounter-click="nc-uspto-full">Search USPTO yourself</a></p>'; }
  function fmt(d) { if (!d) return "date not listed"; return new Date(d + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}); }
  function cta(label, plans) {
        return '<p style="margin:0 0 .5rem"><a class="btn" href="' + MONTHLY + '" data-goatcounter-click="nc-trial">' + label + '</a></p>' +
      '<p class="muted" style="margin:0">$15/month after 7 free days, <a href="' + YEARLY + '" data-goatcounter-click="nc-yearly">$149/year</a>, or <a href="' + PORTFOLIO + '" data-goatcounter-click="nc-portfolio">$49/month for up to 50 brands</a>. Cancel anytime. <a href="' + plans + '">See plans</a></p>';
  }
  function watch(name) { return '<p style="margin:.5rem 0"><a class="btn light" href="' + MONTHLY + '" data-goatcounter-click="nc-watch-preview">Watch ' + esc(name) + ' free for 7 days</a></p>'; }
  function init(f) {
    var r = f.parentNode.querySelector("[data-results]"), b = f.querySelector("button"), label = b.textContent, src = f.getAttribute("data-source") || "name-check", plans = f.getAttribute("data-plans") || "index.html#pricing";
    var ef = f.elements.email, tips = f.querySelector(".nc-tips"), unlock = false, lastName = "", unlockLabel = "Show me the similar names";
    armResultTrialClicks(r);
    function render(html) { r.innerHTML = html; sealDynamicClicks(r); }
    function step1() { unlock = false; ef.hidden = true; if (tips) tips.hidden = true; ef.required = false; b.textContent = label; }
    function step2() { unlock = true; ef.hidden = false; if (tips) tips.hidden = false; ef.required = true; b.textContent = unlockLabel; }
    step1();
    f.elements.name.addEventListener("input", function () { if (unlock && f.elements.name.value.trim() !== lastName) { step1(); render(""); } });
    function previewHTML(d, name) {
      var fb = d.coverage === "60day_fallback", n = d.count || 0, so = (d.counts && d.counts.sound_only) || 0;
      var pool = fb ? "in U.S. applications filed since " + fmt(d.since) : d.total ? "in " + Number(d.total).toLocaleString() + " live U.S. federal marks" : "in live U.S. federal marks";
      var banner = fb ? '<div class="nc-box nc-warn"><p><b>Limited check right now.</b> Our full-register search is temporarily unavailable, so this result only covers U.S. applications filed since ' + fmt(d.since) + ' (about the last 60 days). Older applications and registered marks were not searched.</p></div>' : "";
      var tot = n + so;
      var head = tot ? 'We found ' + tot + ' live filing' + (tot == 1 ? "" : "s") + ' that look' + (tot == 1 ? "s" : "") + ' or sound' + (tot == 1 ? "s" : "") + ' like ' + esc(name) + '.'
        : 'No close matches right now. New filings come in every day.';
      return banner + '<div class="nc-box"><h3>' + head + '</h3><p class="muted">Searched ' + pool.replace(/^in /, "") + '.</p><p>Enter your email to see the details and get an alert if anything new is filed.</p>' + watch(name) + '<p class="muted">Automated screen only: not a clearance search and not legal advice. It does not cover state or common-law (unregistered) rights. <a href="privacy.html">Privacy</a></p></div>';
    }
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var name = f.elements.name.value.trim(), email = unlock ? ef.value.trim() : "", botcheck = f.elements.botcheck.checked;
      b.disabled = true; b.textContent = "Checking...";
      if (!unlock) {
        gc("nc-check-start");
        try {
          var pr = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name, botcheck: botcheck})});
          var pd = await pr.json();
          if (!pr.ok) { render('<p class="nc-err">' + esc(pd.error || "Something went wrong. Please try again.") + '</p>'); b.disabled = false; b.textContent = label; return; }
          lastName = name; gc("nc-check-done"); var tot = (pd.count || 0) + ((pd.counts && pd.counts.sound_only) || 0); unlockLabel = tot ? "Show me the " + tot + " similar name" + (tot == 1 ? "" : "s") : "Show me the full result"; render(previewHTML(pd, name)); b.disabled = false; step2(); ef.focus();
        } catch (e) { render('<p class="nc-err">Something went wrong. Please try again.</p>'); b.disabled = false; b.textContent = label; }
        return;
      }
      render("");
      gc("nc-email-capture");
      if (CAPTURE && !botcheck) {
        var wantTips = !!(f.elements.tips && f.elements.tips.checked);
        var fd = new FormData(); fd.append("access_key", "023b980d-f013-456e-8eaf-0711bed7df93"); fd.append("subject", wantTips ? "New ClashOwl waitlist signup" : "New ClashOwl name check lead (no tips)"); fd.append("weekly_tips", wantTips ? "yes" : "no");
        fd.append("from_name", "ClashOwl name check"); fd.append("email", email); fd.append("source", src); fd.append("brand", name);
        fetch("https://api.web3forms.com/submit", {method: "POST", body: fd}).catch(function () {});
      }
      try {
        var res = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name, email: email, botcheck: botcheck, unlock: true})});
        var d = await res.json();
        if (!res.ok) { render('<p class="nc-err">' + esc(d.error || "Something went wrong. Please try again.") + '</p>'); return; }
        adsLead();
        var fb = d.coverage === "60day_fallback";
        var banner = fb ? '<div class="nc-box nc-warn"><p><b>Limited check right now.</b> Our full-register search is temporarily unavailable, so this result only covers U.S. applications filed since ' + fmt(d.since) + ' (about the last 60 days). Older applications and registered marks were not searched. Please try again later or use the USPTO search button.</p></div>' : "";
        var sounds = (d.sound_alikes || []).length ? '<p class="muted" style="margin-top:1rem">Also sounds similar: ' + d.sound_alikes.map(function (m) { return esc(m.mark) + (m.serial ? ' (<a href="https://tsdr.uspto.gov/#caseNumber=' + encodeURIComponent(m.serial) + '&caseType=SERIAL_NO&searchType=statusSearch" target="_blank" rel="noopener">' + esc(m.serial) + '</a>)' : ""); }).join(", ") + (d.sound_only_more ? ', and ' + d.sound_only_more + ' more' : "") + '.</p>' : "";
        var pool = fb ? "in U.S. applications filed since " + fmt(d.since) : d.total ? "in " + Number(d.total).toLocaleString() + " live U.S. federal marks" : "in live U.S. federal marks";
        var so2 = (d.counts && d.counts.sound_only) || ((d.sound_alikes || []).length + (d.sound_only_more || 0)), tot2 = (d.count || 0) + so2;
        if (!d.count) {
          render(banner + '<div class="nc-box"><h3>' + (so2 ? 'No close look-alikes ' + pool + ', but ' + so2 + ' mark' + (so2 == 1 ? " sounds" : "s sound") + ' similar' : 'No close matches ' + pool) + '</h3><p>' + (fb ? 'We found no recent applications that look or sound like <b>' + esc(name) + '</b>. This was a limited 60-day check, not the full register.' : 'We found no live (pending or registered) U.S. trademarks that look or sound like <b>' + esc(name) + '</b>.') + '</p>' + sounds + '<p>That is a good sign, not a guarantee. State and common-law (unregistered) rights are not covered, and a name can still conflict in ways an automated screen misses.</p>' + uspto(name) +
            '<p>ClashOwl can watch new filings for your name going forward and email you if something similar is filed.</p>' + cta("Watch " + esc(name) + " free for 7 days", plans) + '<p class="muted">Automated screen only: not a clearance search and not legal advice. It does not cover state or common-law (unregistered) rights. Talk to a trademark attorney before you rely on a name.</p></div>');
          return;
        }
        var rows = d.matches.map(function (m) {
          return '<div class="nc-row"><div><b>' + esc(m.mark || "(name unavailable)") + '</b>' + (m.serial ? '<div class="muted">Serial <a href="https://tsdr.uspto.gov/#caseNumber=' + encodeURIComponent(m.serial) + '&caseType=SERIAL_NO&searchType=statusSearch" target="_blank" rel="noopener">' + esc(m.serial) + '</a></div>' : "") + '<div class="muted">' + esc((m.why || []).join(", ") || "similar") + '</div></div><div>Filed ' + fmt(m.filing_date) + ((m.classes || []).length ? '<div class="muted">Class ' + esc(m.classes.join(", ")) + '</div>' : "") + '</div><div>' + esc(m.status) + '</div></div>';
        }).join("");
        var more = d.count > d.matches.length ? '<p class="muted">Showing the closest ' + d.matches.length + ' of ' + d.count + '.</p>' : "";
        render(banner + '<h3>We found ' + tot2 + ' live filing' + (tot2 == 1 ? "" : "s") + ' that look' + (tot2 == 1 ? "s" : "") + ' or sound' + (tot2 == 1 ? "s" : "") + ' like ' + esc(name) + ' ' + pool + (so2 ? ': ' + d.count + ' close match' + (d.count == 1 ? "" : "es") + ' below, plus ' + so2 + ' that only sound' + (so2 == 1 ? "s" : "") + ' similar' : "") + '</h3><p class="muted">' + (fb ? 'Recent applications only (60-day limited check).' : 'Live U.S. federal trademarks (pending or registered) that look or sound like your name. Dead and abandoned marks are left out.') + '</p>' + rows + more + sounds +
          '<div class="nc-box"><p>New filings keep coming. ClashOwl can watch them for your name and email you if something similar is filed.</p>' + uspto(name) + cta("Watch " + esc(name) + " free for 7 days", plans) + '<p class="muted">A possible match isn\'t always a problem. Automated screen only: not a clearance search and not legal advice. It does not cover state or common-law (unregistered) rights. Talk to a trademark attorney before you rely on a name.</p></div>');
      } catch (e) { render('<p class="nc-err">Something went wrong. Please try again.</p>'); }
      finally { b.disabled = false; b.textContent = unlockLabel; }
    });
    if (q.get("name") && !CAPTURE) { f.elements.name.value = q.get("name"); if (q.get("email")) { lastName = q.get("name").trim(); step2(); ef.value = q.get("email"); } f.requestSubmit(); }
  }
  document.querySelectorAll("form[data-namecheck]").forEach(init);
})();
