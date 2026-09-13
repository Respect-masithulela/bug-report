ALTER TABLE public.bugs ALTER COLUMN reporter_id DROP NOT NULL;
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS reporter_email TEXT;
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS client_context JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.bugs ADD COLUMN IF NOT EXISTS widget_key TEXT;

DROP POLICY IF EXISTS "Reporter or assignee can update bugs" ON public.bugs;
CREATE POLICY "Reporter or assignee can update bugs"
ON public.bugs FOR UPDATE TO authenticated
USING (
  (reporter_id IS NOT NULL AND auth.uid() = reporter_id)
  OR auth.uid() = assignee_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TABLE IF NOT EXISTS public.bug_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_id UUID NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'click',
  label TEXT NOT NULL DEFAULT '',
  target TEXT DEFAULT '',
  page_url TEXT DEFAULT '',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bug_events TO authenticated;
GRANT ALL ON public.bug_events TO service_role;

ALTER TABLE public.bug_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bug events viewable by authenticated"
ON public.bug_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert bug events for own bugs"
ON public.bug_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.bugs b WHERE b.id = bug_id AND b.reporter_id = auth.uid()));

CREATE INDEX IF NOT EXISTS bug_events_bug_id_idx ON public.bug_events(bug_id, sequence);