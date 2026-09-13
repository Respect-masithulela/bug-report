import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const MAX_EVENTS = 10;

// Simple in-memory rate limit: 10 reports per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Public status lookup by tracking id — returns status only, no report content.
  if (req.method === "GET") {
    const url = new URL(req.url);
    const ids = (url.searchParams.get("tracking_ids") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^BUG-\d{1,10}$/.test(s))
      .slice(0, 50);
    if (!ids.length) return json({ reports: [] });
    const { data, error } = await admin()
      .from("bugs")
      .select("tracking_id, title, status, severity, created_at, updated_at")
      .in("tracking_id", ids);
    if (error) return json({ error: "Lookup failed" }, 500);
    return json({ reports: data ?? [] });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "Too many reports, try again later." }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const expectedKey = Deno.env.get("ASM_LAB_WIDGET_KEY");
  const widgetKey = str(body.widget_key, 100);
  if (expectedKey && widgetKey !== expectedKey) return json({ error: "Invalid widget key" }, 401);

  const title = str(body.title, 200);
  const description = str(body.description, 5000);
  if (!title || !description) return json({ error: "Title and description are required" }, 400);

  const severityRaw = str(body.severity, 20).toLowerCase();
  const severity = (SEVERITIES as readonly string[]).includes(severityRaw) ? severityRaw : "medium";

  const emailRaw = str(body.reporter_email, 200);
  const reporterEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;

  const ctxIn = (body.client_context ?? {}) as Record<string, unknown>;
  const clientContext: Record<string, string> = {};
  for (const k of ["browser", "os", "screen", "viewport", "url", "referrer", "locale", "timezone", "user_agent"]) {
    clientContext[k] = str(ctxIn[k], 400);
  }

  const rawEvents = Array.isArray(body.events) ? body.events.slice(-MAX_EVENTS) : [];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: bug, error } = await supabase
    .from("bugs")
    .insert({
      title,
      description,
      severity,
      source: "widget",
      reporter_email: reporterEmail,
      reporter_id: null,
      widget_key: widgetKey || null,
      client_context: clientContext,
      environment: [clientContext.browser, clientContext.os, clientContext.viewport].filter(Boolean).join(", "),
    })
    .select("id, tracking_id")
    .single();

  if (error) {
    console.error("bug insert failed", error.message);
    return json({ error: "Could not save report" }, 500);
  }

  if (rawEvents.length) {
    const rows = rawEvents.map((e: Record<string, unknown>, i: number) => {
      const type = str(e.event_type, 20);
      return {
        bug_id: bug.id,
        sequence: i + 1,
        event_type: ["click", "navigate", "submit", "focus", "error"].includes(type) ? type : "click",
        label: str(e.label, 200),
        target: str(e.target, 200),
        page_url: str(e.page_url, 500),
        occurred_at: str(e.occurred_at, 40) || new Date().toISOString(),
      };
    });
    const { error: evErr } = await supabase.from("bug_events").insert(rows);
    if (evErr) console.error("bug_events insert failed", evErr.message);
  }

  return json({ ok: true, tracking_id: bug.tracking_id });
});
