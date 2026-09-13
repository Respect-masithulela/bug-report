/**
 * Lightweight in-memory action tracker.
 * Keeps a rolling buffer of the last N user actions so a bug report can
 * carry the exact trail of what the user did before things broke.
 * Nothing is transmitted until a report is submitted.
 */

export const MAX_ACTIONS = 10;

export type ActionEventType = "click" | "navigate" | "submit" | "focus" | "error";

export interface ActionEvent {
  event_type: ActionEventType;
  label: string;
  target: string;
  page_url: string;
  occurred_at: string;
}

export interface ClientContext {
  browser: string;
  os: string;
  screen: string;
  viewport: string;
  url: string;
  referrer: string;
  locale: string;
  timezone: string;
  user_agent: string;
}

const buffer: ActionEvent[] = [];

export function pushAction(event: Omit<ActionEvent, "occurred_at" | "page_url"> & Partial<Pick<ActionEvent, "page_url" | "occurred_at">>) {
  buffer.push({
    event_type: event.event_type,
    label: (event.label || "").slice(0, 160),
    target: (event.target || "").slice(0, 160),
    page_url: event.page_url ?? window.location.pathname + window.location.search,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
  });
  while (buffer.length > MAX_ACTIONS) buffer.shift();
}

export function getActions(): ActionEvent[] {
  return buffer.slice();
}

export function clearActions() {
  buffer.length = 0;
}

function describe(el: Element): { label: string; target: string } {
  const node = el as HTMLElement;
  const label =
    node.getAttribute?.("aria-label") ||
    node.getAttribute?.("title") ||
    (node.innerText || node.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80) ||
    node.getAttribute?.("name") ||
    node.tagName.toLowerCase();
  const id = node.id ? `#${node.id}` : "";
  const cls = typeof node.className === "string" && node.className ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return { label, target: `${node.tagName.toLowerCase()}${id}${cls}` };
}

export function getClientContext(): ClientContext {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Unknown";
  const version = ua.match(/(?:Edg|OPR|Chrome|Firefox|Version)\/([\d.]+)/)?.[1] || "";
  const os =
    /Windows NT 10/.test(ua) ? "Windows 10/11" :
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "Unknown";

  return {
    browser: version ? `${browser} ${version.split(".")[0]}` : browser,
    os,
    screen: `${window.screen.width}×${window.screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    url: window.location.href,
    referrer: document.referrer || "",
    locale: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    user_agent: ua.slice(0, 400),
  };
}

export function environmentSummary(ctx: ClientContext = getClientContext()) {
  return `${ctx.browser}, ${ctx.os}, ${ctx.viewport}`;
}

let started = false;

/** Attach global listeners once. Safe to call repeatedly. */
export function startActionTracking() {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.("button, a, [role='button'], input[type='submit'], [data-track]");
    if (!el) return;
    const { label, target } = describe(el);
    pushAction({ event_type: "click", label: `Clicked "${label}"`, target });
  };

  const onSubmit = (e: Event) => {
    const el = e.target as Element;
    const { label, target } = describe(el);
    pushAction({ event_type: "submit", label: `Submitted form ${label ? `"${label.slice(0, 40)}"` : ""}`.trim(), target });
  };

  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el || !/^(input|textarea|select)$/i.test(el.tagName)) return;
    const name = el.getAttribute("name") || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.id;
    if (!name) return;
    pushAction({ event_type: "focus", label: `Focused field "${name}"`, target: el.tagName.toLowerCase() });
  };

  const onError = (e: ErrorEvent) => {
    pushAction({ event_type: "error", label: `Error: ${e.message}`.slice(0, 160), target: e.filename || "" });
  };

  document.addEventListener("click", onClick, true);
  document.addEventListener("submit", onSubmit, true);
  document.addEventListener("focusin", onFocus as EventListener, true);
  window.addEventListener("error", onError);

  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("submit", onSubmit, true);
    document.removeEventListener("focusin", onFocus as EventListener, true);
    window.removeEventListener("error", onError);
    started = false;
  };
}

/** Format the trail as pasteable repro steps. */
export function formatRepro(events: { label: string; page_url?: string | null; occurred_at: string }[]) {
  return events
    .map((e, i) => `${i + 1}. ${e.label}${e.page_url ? ` (${e.page_url})` : ""}`)
    .join("\n");
}
