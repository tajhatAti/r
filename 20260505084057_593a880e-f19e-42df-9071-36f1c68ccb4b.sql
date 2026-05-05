
-- Drop loose policies
DROP POLICY IF EXISTS "Anyone can insert a visit" ON public.visits;
DROP POLICY IF EXISTS "Anyone can update their session heartbeat" ON public.visits;

-- Secure function for tracking visits (anon + authenticated can call)
CREATE OR REPLACE FUNCTION public.track_visit(_session_id TEXT, _page TEXT DEFAULT NULL, _user_agent TEXT DEFAULT NULL, _referrer TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _session_id IS NULL OR length(_session_id) < 8 OR length(_session_id) > 100 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;
  -- One row per session per day; update heartbeat thereafter
  IF EXISTS (SELECT 1 FROM public.visits WHERE session_id = _session_id AND created_at::date = (now() AT TIME ZONE 'Asia/Dhaka')::date) THEN
    UPDATE public.visits SET last_seen_at = now(), page = COALESCE(_page, page)
      WHERE session_id = _session_id AND created_at::date = (now() AT TIME ZONE 'Asia/Dhaka')::date;
  ELSE
    INSERT INTO public.visits (session_id, page, user_agent, referrer)
      VALUES (_session_id, _page, _user_agent, _referrer);
  END IF;
END; $$;

-- Lock down execute & expose only what's needed
REVOKE ALL ON FUNCTION public.track_visit(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_visit(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_visit_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visit_stats() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
