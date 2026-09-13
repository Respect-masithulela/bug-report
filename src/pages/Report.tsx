import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Loader2, MousePointerClick } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { getActions, getClientContext, environmentSummary, clearActions } from "@/lib/actionTracker";
import { addLocalReport, BUG_INTAKE_ENDPOINT } from "@/lib/localReports";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export default function Report() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [trail] = useState(() => getActions().filter((a) => !a.page_url.startsWith("/report")));
  const [clientContext] = useState(() => getClientContext());

  const [form, setForm] = useState({
    title: "",
    description: "",
    steps_to_reproduce: "",
    severity: "medium" as (typeof SEVERITIES)[number],
    reporter_email: "",
    environment: "",
  });

  useEffect(() => {
    setForm((prev) => (prev.environment ? prev : { ...prev, environment: environmentSummary(clientContext) }));
  }, [clientContext]);

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(BUG_INTAKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: [form.description.trim(), form.steps_to_reproduce.trim() && `\n\nSteps to reproduce:\n${form.steps_to_reproduce.trim()}`]
            .filter(Boolean)
            .join(""),
          severity: form.severity,
          reporter_email: form.reporter_email.trim(),
          client_context: clientContext,
          events: trail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not send your report");
      addLocalReport({ tracking_id: data.tracking_id, title: form.title.trim(), reported_at: new Date().toISOString() });
      clearActions();
      setDone(data.tracking_id);
    } catch (error: any) {
      toast({ title: "Report not sent", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[760px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <StackedLogo size={16} />
            <span className="text-[14px] font-bold tracking-[0.08em] uppercase">ASM Lab</span>
          </Link>
          <Link to="/track" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Track my reports
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-[760px] px-6 py-10">
        {done ? (
          <div className="border border-border p-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <h1 className="text-[20px] font-medium">Thanks — your report is in.</h1>
            <p className="text-[13px] text-muted-foreground">
              Your tracking number is <span className="font-mono text-foreground">{done}</span>. Keep this page bookmarked to check on it.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Link to="/track">
                <Button size="sm" className="h-8 text-[13px]">See my reports</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[13px]"
                onClick={() => {
                  setDone(null);
                  setForm({ title: "", description: "", steps_to_reproduce: "", severity: "medium", reporter_email: form.reporter_email, environment: environmentSummary(clientContext) });
                }}
              >
                Report another
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Link to="/">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <h1 className="text-[20px] font-medium tracking-[-0.02em]">Report a bug</h1>
            </div>
            <p className="text-[13px] text-muted-foreground mb-8">
              No account needed. Tell us what went wrong and we'll take it from there.
            </p>

            <form onSubmit={handleSubmit} className="border border-border">
              <div className="px-5 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">What went wrong? *</Label>
                <Input
                  placeholder="Brief summary of the bug"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                  maxLength={200}
                  className="h-8 text-base font-medium border-none shadow-none px-0 focus-visible:ring-0"
                />
              </div>

              <div className="px-5 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Describe it *</Label>
                <Textarea
                  placeholder="What happened, and what did you expect instead?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  required
                  rows={4}
                  maxLength={5000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>

              <div className="px-5 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Steps to reproduce</Label>
                <Textarea
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                  value={form.steps_to_reproduce}
                  onChange={(e) => update("steps_to_reproduce", e.target.value)}
                  rows={3}
                  maxLength={3000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="px-5 py-4 border-b border-border md:border-r space-y-1">
                  <Label className="text-[12px] text-muted-foreground">How bad is it?</Label>
                  <Select value={form.severity} onValueChange={(v) => update("severity", v)}>
                    <SelectTrigger className="h-8 text-[13px] border-none shadow-none px-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-5 py-4 border-b border-border space-y-1">
                  <Label className="text-[12px] text-muted-foreground">Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="Only if you'd like a reply"
                    value={form.reporter_email}
                    onChange={(e) => update("reporter_email", e.target.value)}
                    maxLength={200}
                    className="h-8 text-[13px] border-none shadow-none px-0 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[12px] font-medium text-muted-foreground">
                    Attached automatically · {trail.length} recent action{trail.length === 1 ? "" : "s"}
                  </p>
                </div>
                {trail.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No recent actions recorded.</p>
                ) : (
                  <ol className="space-y-0.5">
                    {trail.map((a, i) => (
                      <li key={i} className="text-[12px] text-muted-foreground truncate">
                        <span className="font-mono mr-1.5">{i + 1}.</span>{a.label}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">
                  {clientContext.browser} · {clientContext.os} · {clientContext.viewport}
                </p>
              </div>

              <div className="px-5 py-4">
                <Button type="submit" disabled={submitting} size="sm" className="h-8 text-[13px]">
                  {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Send report
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
