import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StackedLogo } from "@/components/StackedLogo";
import { Loader2, Search } from "lucide-react";
import { getLocalReports, addLocalReport, BUG_INTAKE_ENDPOINT } from "@/lib/localReports";

interface RemoteReport {
  tracking_id: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string;
}

const SOLVED = ["resolved", "closed"];

const label = (status: string) =>
  SOLVED.includes(status) ? "Solved" : status === "new" ? "Received" : "In progress";

export default function Track() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<RemoteReport[]>([]);
  const [lookup, setLookup] = useState("");

  const load = async (ids: string[]) => {
    if (!ids.length) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BUG_INTAKE_ENDPOINT}?tracking_ids=${encodeURIComponent(ids.join(","))}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(getLocalReports().map((r) => r.tracking_id));
  }, []);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = lookup.trim().toUpperCase();
    if (!/^BUG-\d{1,10}$/.test(id)) return;
    addLocalReport({ tracking_id: id, title: "", reported_at: new Date().toISOString() });
    setLookup("");
    await load(getLocalReports().map((r) => r.tracking_id));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[760px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <StackedLogo size={16} />
            <span className="text-[14px] font-bold tracking-[0.08em] uppercase">ASM Lab</span>
          </Link>
          <Link to="/report">
            <Button size="sm" className="h-8 text-[13px]">Report a bug</Button>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-[760px] px-6 py-10">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]">My reports</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Reports sent from this computer, and whether they're solved yet.
        </p>

        <form onSubmit={handleLookup} className="mt-6 flex gap-2">
          <Input
            placeholder="Add a tracking number, e.g. BUG-00012"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            className="h-8 text-[13px] max-w-[280px]"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8 text-[13px] gap-1.5">
            <Search className="h-3.5 w-3.5" /> Look up
          </Button>
        </form>

        <div className="mt-8 border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-[13px] text-muted-foreground">No reports from this computer yet.</p>
              <Link to="/report">
                <Button size="sm" className="h-8 text-[13px]">Report a bug</Button>
              </Link>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.tracking_id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">{r.tracking_id}</span>
                <span className="text-[13px] truncate flex-1">{r.title}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 border shrink-0 ${
                    SOLVED.includes(r.status)
                      ? "border-success/40 text-success"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {label(r.status)}
                </span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
