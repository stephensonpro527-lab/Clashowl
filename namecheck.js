// ClashOwl free name check. Used by the homepage hero and free-name-check.html.
// Markup: <form data-namecheck data-source="..." data-plans="#pricing"> with inputs name, email, botcheck, a submit button, and a [data-results] element after it.
(function () {
  var API = window.NC_API || "https://clashowl-namecheck.clashowl.workers.dev/api/check";
  var MONTHLY = "https://buy.stripe.com/3cIbJ2gqK0am6SP3ECbo400", YEARLY = "https://buy.stripe.com/3cIcN6b6qf5gb956QObo401", PORTFOLIO = "https://buy.stripe.com/28E3cwa2m4qC1yv0sqbo403";
  var q = new URLSearchParams(location.search), CAPTURE = q.get("capture") !== "0"; // add ?capture=0 when testing so no signups are created
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function fake(n) { var s = ""; for (var i = 0; i < Math.min(Math.max(n, 4), 18); i++) s += "ABCDEFGHKLMNOPRSTUVW"[Math.random() * 20 | 0]; return s; }
  function fmt(d) { return new Date(d + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}); }
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
        var since = d.since ? fmt(d.since) : "recently";
        if (!d.count) {
          r.innerHTML = '<div class="nc-box"><h3>Looks clear for now</h3><p>We didn\'t find any U.S. trademark applications filed since ' + since + ' that look or sound like <b>' + esc(name) + '</b>.</p><p>New ones are filed every day, though. ClashOwl checks each one against your name and emails you if something comes up.</p>' +
            cta("Start your 7-day free trial to watch it daily", plans) + '<p class="muted">This is a quick check of recent applications, not a full clearance search or legal advice.</p></div>';
          return;
        }
        var rows = d.matches.map(function (m) {
          return '<div class="nc-row"><div><span class="nc-blur" aria-hidden="true">' + fake(m.length) + '</span><span class="sr">Name hidden</span><div class="muted">' + esc(m.why.join(", ") || "similar") + '</div></div><div>Filed ' + fmt(m.filing_date) + '<div class="muted">Class ' + esc(m.classes.join(", ") || "not listed") + '</div></div><div>' + esc(m.status) + '</div></div>';
        }).join("");
        var more = d.count > d.matches.length ? '<p class="muted">Showing the closest ' + d.matches.length + ' of ' + d.count + '.</p>' : "";
        r.innerHTML = '<h3>We found ' + d.count + ' possible match' + (d.count == 1 ? "" : "es") + ' for ' + esc(name) + '</h3><p class="muted">U.S. trademark applications filed since ' + since + ' that look or sound like your name.</p>' + rows + more +
          '<div class="nc-box">' + cta("Start your 7-day free trial to see the names and get daily alerts", plans) + '<p class="muted">A possible match isn\'t always a problem, and this isn\'t legal advice.</p></div>';
      } catch (e) { r.innerHTML = '<p class="nc-err">Something went wrong. Please try again.</p>'; }
      finally { b.disabled = false; b.textContent = label; }
    });
    if (q.get("name") && q.get("email") && !CAPTURE) { f.elements.name.value = q.get("name"); f.elements.email.value = q.get("email"); f.requestSubmit(); }
  }
  document.querySelectorAll("form[data-namecheck]").forEach(init);
})();
