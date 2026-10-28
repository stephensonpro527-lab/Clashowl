// ClashOwl free name check. Used by the homepage hero and free-name-check.html.
// Markup: <form data-namecheck data-source="..." data-plans="#pricing"> with inputs name, email, botcheck, a submit button, and a [data-results] element after it.
(function () {
  var API = window.NC_API || "https://clashowl-namecheck.clashowl.workers.dev/api/check";
  var MONTHLY = "https://buy.stripe.com/3cIbJ2gqK0am6SP3ECbo400", YEARLY = "https://buy.stripe.com/3cIcN6b6qf5gb956QObo401", PORTFOLIO = "https://buy.stripe.com/28E3cwa2m4qC1yv0sqbo403";
  var q = new URLSearchParams(location.search), CAPTURE = q.get("capture") !== "0"; // add ?capture=0 when testing so no signups are created
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function uspto(n) { return '<p><a class="btn" href="https://tmsearch.uspto.gov/search/search-results?query=' + encodeURIComponent(n) + '" target="_blank" rel="noopener" data-goatcounter-click="nc-uspto-full">Search USPTO yourself</a></p>'; }
  function fmt(d) { if (!d) return "date not listed"; return new Date(d + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}); }
  function cta(label, plans) {
    return '<p style="margin:0 0 .5rem"><a class="btn" href="' + MONTHLY + '" data-goatcounter-click="nc-trial">' + label + '</a></p>' +
      '<p class="muted" style="margin:0">$15/month after 7 free days, <a href="' + YEARLY + '" data-goatcounter-click="nc-yearly">$149/year</a>, or <a href="' + PORTFOLIO + '" data-goatcounter-click="nc-portfolio">$49/month for up to 15 brands</a>. Cancel anytime. <a href="' + plans + '">See plans</a></p>';
  }
  function init(f) {
    var r = f.parentNode.querySelector("[data-results]"), b = f.querySelector("button"), label = b.textContent, src = f.getAttribute("data-source") || "name-check", plans = f.getAttribute("data-plans") || "index.html#pricing";
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var name = f.elements.name.value.trim(), email = f.elements.email.value.trim(), botcheck = f.elements.botcheck.checked;
      b.disabled = true; b.textContent = "Checking..."; r.innerHTML = "";
      if (CAPTURE && !botcheck) {
        var fd = new FormData(); fd.append("access_key", "023b980d-f013-456e-8eaf-0711bed7df93"); fd.append("subject", "New ClashOwl waitlist signup");
        fd.append("from_name", "ClashOwl name check"); fd.append("email", email); fd.append("source", src); fd.append("brand", name);
        fetch("https://api.web3forms.com/submit", {method: "POST", body: fd}).catch(function () {});
      }
      try {
        var res = await fetch(API, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name, email: email, botcheck: botcheck})});
        var d = await res.json();
        if (!res.ok) { r.innerHTML = '<p class="nc-err">' + esc(d.error || "Something went wrong. Please try again.") + '</p>'; return; }
        var fb = d.coverage === "60day_fallback";
        var banner = fb ? '<div class="nc-box nc-warn"><p><b>Limited check right now.</b> Our full-register search is temporarily unavailable, so this result only covers U.S. applications filed since ' + fmt(d.since) + ' (about the last 60 days). Older applications and registered marks were not searched. Please try again later or use the USPTO search button.</p></div>' : "";
        var sounds = (d.sound_alikes || []).length ? '<p class="muted" style="margin-top:1rem">Also sounds similar: ' + d.sound_alikes.map(function (m) { return esc(m.mark) + (m.serial ? ' (<a href="https://tsdr.uspto.gov/#caseNumber=' + encodeURIComponent(m.serial) + '&caseType=SERIAL_NO&searchType=statusSearch" target="_blank" rel="noopener">' + esc(m.serial) + '</a>)' : ""); }).join(", ") + (d.sound_only_more ? ', and ' + d.sound_only_more + ' more' : "") + '.</p>' : "";
        var pool = fb ? "in U.S. applications filed since " + fmt(d.since) : d.total ? "in " + Number(d.total).toLocaleString() + " live U.S. federal marks" : "in live U.S. federal marks";
        if (!d.count) {
          r.innerHTML = banner + '<div class="nc-box"><h3>No close matches ' + pool + '</h3><p>' + (fb ? 'We found no recent applications that look or sound like <b>' + esc(name) + '</b>. This was a limited 60-day check, not the full register.' : 'We found no live (pending or registered) U.S. trademarks that look or sound like <b>' + esc(name) + '</b>.') + '</p>' + sounds + '<p>That is a good sign, not a guarantee. State and common-law (unregistered) rights are not covered, and a name can still conflict in ways an automated screen misses.</p>' + uspto(name) +
            '<p>ClashOwl can watch new filings for your name going forward and email you if something similar is filed.</p>' + cta("Start your 7-day free trial to watch new filings daily", plans) + '<p class="muted">Automated screen only: not a clearance search and not legal advice. It does not cover state or common-law (unregistered) rights. Talk to a trademark attorney before you rely on a name.</p></div>';
          return;
        }
        var rows = d.matches.map(function (m) {
          return '<div class="nc-row"><div><b>' + esc(m.mark || "(name unavailable)") + '</b>' + (m.serial ? '<div class="muted">Serial <a href="https://tsdr.uspto.gov/#caseNumber=' + encodeURIComponent(m.serial) + '&caseType=SERIAL_NO&searchType=statusSearch" target="_blank" rel="noopener">' + esc(m.serial) + '</a></div>' : "") + '<div class="muted">' + esc((m.why || []).join(", ") || "similar") + '</div></div><div>Filed ' + fmt(m.filing_date) + ((m.classes || []).length ? '<div class="muted">Class ' + esc(m.classes.join(", ")) + '</div>' : "") + '</div><div>' + esc(m.status) + '</div></div>';
        }).join("");
        var more = d.count > d.matches.length ? '<p class="muted">Showing the closest ' + d.matches.length + ' of ' + d.count + '.</p>' : "";
        r.innerHTML = banner + '<h3>We found ' + d.count + ' possible match' + (d.count == 1 ? "" : "es") + ' for ' + esc(name) + ' ' + pool + '</h3><p class="muted">' + (fb ? 'Recent applications only (60-day limited check).' : 'Live U.S. federal trademarks (pending or registered) that look or sound like your name. Dead and abandoned marks are left out.') + '</p>' + rows + more + sounds +
          '<div class="nc-box"><p>New filings keep coming. ClashOwl can watch them for your name and email you if something similar is filed.</p>' + uspto(name) + cta("Start your 7-day free trial to watch new filings daily", plans) + '<p class="muted">A possible match isn\'t always a problem. Automated screen only: not a clearance search and not legal advice. It does not cover state or common-law (unregistered) rights. Talk to a trademark attorney before you rely on a name.</p></div>';
      } catch (e) { r.innerHTML = '<p class="nc-err">Something went wrong. Please try again.</p>'; }
      finally { b.disabled = false; b.textContent = label; }
    });
    if (q.get("name") && q.get("email") && !CAPTURE) { f.elements.name.value = q.get("name"); f.elements.email.value = q.get("email"); f.requestSubmit(); }
  }
  document.querySelectorAll("form[data-namecheck]").forEach(init);
})();
