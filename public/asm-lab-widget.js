/*!
 * ASM Lab bug reporting widget
 * Drop into any page:
 *   <script src="https://YOUR-TRACKER/asm-lab-widget.js"
 *           data-endpoint="https://YOUR-TRACKER-API/functions/v1/bug-intake"
 *           data-widget-key="YOUR_KEY"
 *           data-accent="#6d5efc"></script>
 *
 * Keeps the last 10 user actions in memory and sends them only when a
 * report is submitted. No background network calls, no cookies.
 */
(function () {
  "use strict";
  if (window.__asmLabWidget) return;
  window.__asmLabWidget = true;

  var script = document.currentScript;
  var cfg = {
    endpoint: (script && script.getAttribute("data-endpoint")) || "",
    key: (script && script.getAttribute("data-widget-key")) || "",
    accent: (script && script.getAttribute("data-accent")) || "#6d5efc",
    label: (script && script.getAttribute("data-label")) || "Report a bug",
  };

  var MAX = 10;
  var trail = [];

  function push(type, label, target) {
    trail.push({
      event_type: type,
      label: String(label || "").slice(0, 160),
      target: String(target || "").slice(0, 160),
      page_url: location.pathname + location.search,
      occurred_at: new Date().toISOString(),
    });
    while (trail.length > MAX) trail.shift();
  }

  function describe(el) {
    var label =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) ||
      el.getAttribute("name") ||
      el.tagName.toLowerCase();
    var id = el.id ? "#" + el.id : "";
    return { label: label, target: el.tagName.toLowerCase() + id };
  }

  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("button, a, [role='button'], input[type='submit']");
    if (!el || el.closest("#asm-lab-widget-root")) return;
    var d = describe(el);
    push("click", 'Clicked "' + d.label + '"', d.target);
  }, true);

  document.addEventListener("submit", function (e) {
    var d = describe(e.target);
    push("submit", "Submitted form " + (d.label ? '"' + d.label.slice(0, 40) + '"' : ""), d.target);
  }, true);

  document.addEventListener("focusin", function (e) {
    var el = e.target;
    if (!el || !/^(input|textarea|select)$/i.test(el.tagName)) return;
    if (el.closest && el.closest("#asm-lab-widget-root")) return;
    var name = el.getAttribute("name") || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.id;
    if (name) push("focus", 'Focused field "' + name + '"', el.tagName.toLowerCase());
  }, true);

  window.addEventListener("error", function (e) {
    push("error", ("Error: " + e.message).slice(0, 160), e.filename || "");
  });

  (function trackNav() {
    var last = location.pathname + location.search;
    function record() {
      var now = location.pathname + location.search;
      if (now !== last) { last = now; push("navigate", "Navigated to " + location.pathname, location.pathname); }
    }
    ["pushState", "replaceState"].forEach(function (m) {
      var orig = history[m];
      history[m] = function () { var r = orig.apply(this, arguments); record(); return r; };
    });
    window.addEventListener("popstate", record);
    push("navigate", "Opened " + location.pathname, location.pathname);
  })();

  function context() {
    var ua = navigator.userAgent;
    var browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
      : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown";
    var v = ua.match(/(?:Edg|OPR|Chrome|Firefox|Version)\/([\d.]+)/);
    var os = /Windows NT 10/.test(ua) ? "Windows 10/11" : /Windows/.test(ua) ? "Windows"
      : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android"
      : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
    return {
      browser: v ? browser + " " + v[1].split(".")[0] : browser,
      os: os,
      screen: screen.width + "\u00d7" + screen.height,
      viewport: innerWidth + "\u00d7" + innerHeight,
      url: location.href,
      referrer: document.referrer || "",
      locale: navigator.language || "",
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
      user_agent: ua.slice(0, 400),
    };
  }

  var root = document.createElement("div");
  root.id = "asm-lab-widget-root";
  var shadow = root.attachShadow ? root.attachShadow({ mode: "open" }) : root;

  var style = document.createElement("style");
  style.textContent = [
    ":host,*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
    ".fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;background:" + cfg.accent + ";color:#fff;border:0;border-radius:999px;padding:11px 16px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)}",
    ".panel{position:fixed;right:20px;bottom:76px;z-index:2147483000;width:330px;max-width:calc(100vw - 40px);background:#fff;color:#111;border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.28);padding:16px;display:none}",
    ".panel.open{display:block}",
    "h3{margin:0 0 4px;font-size:14px}",
    "p.sub{margin:0 0 12px;font-size:12px;color:#666}",
    "label{display:block;font-size:11px;color:#666;margin:10px 0 4px}",
    "input,textarea,select{width:100%;border:1px solid #ddd;border-radius:7px;padding:8px;font-size:13px;background:#fff;color:#111}",
    "textarea{resize:vertical;min-height:70px}",
    ".row{display:flex;gap:8px;margin-top:14px}",
    ".btn{flex:1;border:0;border-radius:7px;padding:9px;font-size:13px;font-weight:600;cursor:pointer}",
    ".primary{background:" + cfg.accent + ";color:#fff}",
    ".ghost{background:#f2f2f4;color:#333}",
    ".note{margin-top:10px;font-size:11px;color:#888}",
    ".ok{font-size:13px;color:#111;padding:8px 0}",
  ].join("");

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML =
    '<h3>Report a bug</h3>' +
    '<p class="sub">We\'ll attach your last ' + MAX + ' actions and device info.</p>' +
    '<form id="f">' +
    '<label>What went wrong? *</label><input id="title" maxlength="200" required placeholder="Short summary" />' +
    '<label>Details *</label><textarea id="desc" maxlength="5000" required placeholder="What did you expect, what happened?"></textarea>' +
    '<label>Severity</label><select id="sev"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select>' +
    '<label>Your email (optional)</label><input id="email" type="email" maxlength="200" placeholder="you@example.com" />' +
    '<div class="row"><button type="button" class="btn ghost" id="cancel">Cancel</button><button type="submit" class="btn primary" id="send">Send report</button></div>' +
    '<div class="note">No screenshots or typed values are captured.</div>' +
    '</form>';

  var fab = document.createElement("button");
  fab.className = "fab";
  fab.type = "button";
  fab.textContent = cfg.label;

  shadow.appendChild(style);
  shadow.appendChild(panel);
  shadow.appendChild(fab);
  document.body.appendChild(root);

  function q(id) { return shadow.getElementById ? shadow.getElementById(id) : document.getElementById(id); }

  fab.addEventListener("click", function () { panel.classList.toggle("open"); });
  q("cancel").addEventListener("click", function () { panel.classList.remove("open"); });

  q("f").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!cfg.endpoint) { alert("ASM Lab widget: missing data-endpoint"); return; }
    var btn = q("send");
    btn.disabled = true; btn.textContent = "Sending…";
    fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widget_key: cfg.key,
        title: q("title").value,
        description: q("desc").value,
        severity: q("sev").value,
        reporter_email: q("email").value || null,
        client_context: context(),
        events: trail.slice(-MAX),
      }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.b && res.b.error) || "Failed");
        panel.innerHTML = '<h3>Thanks!</h3><p class="ok">Your report was sent. Reference: <b>' + (res.b.tracking_id || "") + '</b></p>';
        setTimeout(function () { panel.classList.remove("open"); }, 2500);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "Send report";
        alert("Could not send report: " + err.message);
      });
  });
})();
