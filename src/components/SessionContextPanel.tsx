import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, MousePointerClick, Navigation, SendHorizonal, TextCursorInput, AlertTriangle } from "lucide-react";
import { formatRepro } from "@/lib/actionTracker";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type EventRow = Tables<"bug_events">;

const iconFor = (type: string) => {
  switch (type) {
    case "navigate": return Navigation;
    case "submit": return SendHorizonal;
    case "focus": return TextCursorInput;
    case "error": return AlertTriangle;
    default: return MousePointerClick;
  }
};

function gap(prev?: string, curr?: string) {
  if (!prev || !curr) return "";
  const ms = new Date(curr).getTime() - new Date(prev).getTime();
  if (ms < 1000) return `+${ms}ms`;
  if (ms < 60000) return `+${(ms / 1000).toFixed(1)}s`;
  return `+${Math.round(ms / 60000)}m`;
}

interface Props {
  events: EventRow[];
  context: Record<string, string> | null;
}

export function SessionContextPanel({ events, context }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const header = context
      ? `Environment: ${[context.browser, context.os, context.viewport].filter(Boolean).join(" · ")}\nPage: ${context.url || "—"}\n\n`
      : "";
    await navigator.clipboard.writeText(header + "Steps observed:\n" + formatRepro(events));
    setCopied(true);
    toast({ title: "Repro steps copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!events.length && !context) return null;

  return (
    <div className="px-4 md:px-6 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-muted-foreground font-medium">
          Session Context {events.length > 0 && `· last ${events.length} actions`}
        </p>
        <Button variant="ghost" size="sm" onClick={copy} className="h-6 text-[11px] px-2">
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          Copy repro steps
        </Button>
      </div>

      {context && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            ["Browser", context.browser],
            ["OS", context.os],
            ["Screen", context.screen],
            ["Viewport", context.viewport],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-border px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="text-[12px] truncate">{v || "—"}</p>
            </div>
          ))}
          {context.url && (
            <div className="col-span-2 md:col-span-4 rounded border border-border px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Page URL</p>
              <p className="text-[12px] break-all">{context.url}</p>
            </div>
          )}
        </div>
      )}

      {events.length > 0 && (
        <ol className="space-y-1.5">
          {events.map((e, i) => {
            const Icon = iconFor(e.event_type);
            return (
              <li key={e.id} className="flex items-start gap-2">
                <span className="text-[11px] text-muted-foreground font-mono w-5 shrink-0 pt-0.5">{i + 1}.</span>
                <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${e.event_type === "error" ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">{e.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.page_url || "—"}
                    {i > 0 && <span className="ml-2 font-mono">{gap(events[i - 1].occurred_at, e.occurred_at)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
