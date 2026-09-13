import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { getActions, getClientContext, environmentSummary, clearActions } from "@/lib/actionTracker";
import { MousePointerClick } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

export default function BugCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Snapshot the action trail + environment when the report form opens.
  const [trail] = useState(() => getActions().filter((a) => !a.page_url.startsWith("/bugs/new")));
  const [clientContext] = useState(() => getClientContext());

  const [form, setForm] = useState({
    title: "", description: "", steps_to_reproduce: "",
    expected_behavior: "", actual_behavior: "",
    severity: "medium" as Enums<"bug_severity">, environment: "",
  });

  useEffect(() => {
    setForm((prev) => (prev.environment ? prev : { ...prev, environment: environmentSummary(clientContext) }));
  }, [clientContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = {
      title: form.title.trim(), description: form.description.trim(),
      steps_to_reproduce: form.steps_to_reproduce.trim(),
      expected_behavior: form.expected_behavior.trim(),
      actual_behavior: form.actual_behavior.trim(),
      severity: form.severity, environment: form.environment.trim(),
    };
    if (!trimmed.title || !trimmed.description) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("bugs")
        .insert({
          ...trimmed,
          reporter_id: user.id,
          source: "internal",
          reporter_email: user.email ?? null,
          client_context: clientContext as unknown as Record<string, string>,
        })
        .select("id, tracking_id")
        .single();
      if (error) throw error;

      if (trail.length > 0) {
        await supabase.from("bug_events").insert(
          trail.map((e, i) => ({
            bug_id: data.id,
            sequence: i + 1,
            event_type: e.event_type,
            label: e.label,
            target: e.target,
            page_url: e.page_url,
            occurred_at: e.occurred_at,
          }))
        );
      }
      clearActions();
      toast({ title: "Bug reported!", description: `Tracking ID: ${data.tracking_id}` });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Failed to create bug", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-7 w-7">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <h1 className="text-[13px] font-medium">Report a Bug</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="max-w-2xl">
            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Title *</Label>
              <Input
                placeholder="Brief summary of the bug"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required maxLength={200}
                className="h-8 text-[13px] border-none shadow-none px-0 focus-visible:ring-0 font-medium text-base"
              />
            </div>

            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Description *</Label>
              <Textarea
                placeholder="Detailed description of the issue"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                required rows={4} maxLength={5000}
                className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
              />
            </div>

            <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
              <Label className="text-[12px] text-muted-foreground">Steps to Reproduce</Label>
              <Textarea
                placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                value={form.steps_to_reproduce}
                onChange={(e) => update("steps_to_reproduce", e.target.value)}
                rows={3} maxLength={5000}
                className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-4 md:px-6 py-4 border-b border-border md:border-r space-y-1">
                <Label className="text-[12px] text-muted-foreground">Expected Behavior</Label>
                <Textarea
                  placeholder="What should happen?"
                  value={form.expected_behavior}
                  onChange={(e) => update("expected_behavior", e.target.value)}
                  rows={2} maxLength={2000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>
              <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Actual Behavior</Label>
                <Textarea
                  placeholder="What happened instead?"
                  value={form.actual_behavior}
                  onChange={(e) => update("actual_behavior", e.target.value)}
                  rows={2} maxLength={2000}
                  className="text-[13px] border-none shadow-none px-0 focus-visible:ring-0 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="px-4 md:px-6 py-4 border-b border-border md:border-r space-y-1">
                <Label className="text-[12px] text-muted-foreground">Severity *</Label>
                <Select value={form.severity} onValueChange={(v) => update("severity", v)}>
                  <SelectTrigger className="h-8 text-[13px] border-none shadow-none px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.bug_severity.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-4 md:px-6 py-4 border-b border-border space-y-1">
                <Label className="text-[12px] text-muted-foreground">Environment</Label>
                <Input
                  placeholder="e.g. Chrome 120, macOS 14"
                  value={form.environment}
                  onChange={(e) => update("environment", e.target.value)}
                  maxLength={200}
                  className="h-8 text-[13px] border-none shadow-none px-0 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 border-b border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground font-medium">
                  Attached session context · {trail.length} action{trail.length === 1 ? "" : "s"}
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

            <div className="px-4 md:px-6 py-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} size="sm" className="h-8 text-[13px]">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} size="sm" className="h-8 text-[13px]">
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Submit Bug Report
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
