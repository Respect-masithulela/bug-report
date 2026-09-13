CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','moderator')
  )
$$;

DROP POLICY IF EXISTS "Bugs viewable by authenticated" ON public.bugs;
CREATE POLICY "Bugs viewable by reporter, assignee or staff"
ON public.bugs FOR SELECT TO authenticated
USING (
  (reporter_id IS NOT NULL AND reporter_id = auth.uid())
  OR assignee_id = auth.uid()
  OR public.is_staff(auth.uid())
);

DROP POLICY IF EXISTS "Bug events viewable by authenticated" ON public.bug_events;
CREATE POLICY "Bug events viewable with their bug"
ON public.bug_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bugs b
    WHERE b.id = bug_events.bug_id
      AND ((b.reporter_id IS NOT NULL AND b.reporter_id = auth.uid())
           OR b.assignee_id = auth.uid()
           OR public.is_staff(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Activity viewable by authenticated" ON public.activity_log;
CREATE POLICY "Activity viewable with its bug"
ON public.activity_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bugs b
    WHERE b.id = activity_log.bug_id
      AND ((b.reporter_id IS NOT NULL AND b.reporter_id = auth.uid())
           OR b.assignee_id = auth.uid()
           OR public.is_staff(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Comments viewable by authenticated" ON public.comments;
CREATE POLICY "Comments viewable with their bug"
ON public.comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bugs b
    WHERE b.id = comments.bug_id
      AND ((b.reporter_id IS NOT NULL AND b.reporter_id = auth.uid())
           OR b.assignee_id = auth.uid()
           OR public.is_staff(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Attachments viewable by authenticated" ON public.attachments;
CREATE POLICY "Attachments viewable with their bug"
ON public.attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bugs b
    WHERE b.id = attachments.bug_id
      AND ((b.reporter_id IS NOT NULL AND b.reporter_id = auth.uid())
           OR b.assignee_id = auth.uid()
           OR public.is_staff(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated can view bug attachments" ON storage.objects;
CREATE POLICY "Bug attachment files viewable by owner or staff"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'bug-attachments'
  AND (owner = auth.uid() OR public.is_staff(auth.uid()))
);
