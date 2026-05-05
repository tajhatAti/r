
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Admins manage assignments" ON public.assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notifications (broadcast popups)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active notifications" ON public.notifications
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Announcements (pinned banner)
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Visits / analytics
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX visits_session_idx ON public.visits(session_id);
CREATE INDEX visits_last_seen_idx ON public.visits(last_seen_at DESC);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a visit" ON public.visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their session heartbeat" ON public.visits FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read visits for stats" ON public.visits FOR SELECT USING (true);

-- Stats RPC (counts)
CREATE OR REPLACE FUNCTION public.get_visit_stats()
RETURNS TABLE(live_count BIGINT, today_count BIGINT, total_count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(DISTINCT session_id) FROM public.visits WHERE last_seen_at > now() - interval '2 minutes'),
    (SELECT COUNT(DISTINCT session_id) FROM public.visits WHERE created_at::date = (now() AT TIME ZONE 'Asia/Dhaka')::date),
    (SELECT COUNT(DISTINCT session_id) FROM public.visits);
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER assignments_touch BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
