// Lovable Cloud (Supabase) config — public anon key, safe to ship.
// Loaded via CDN before this file:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
window.LC_URL = "https://pigjnvhjqqqbehtyszlx.supabase.co";
window.LC_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZ2pudmhqcXFxYmVodHlzemx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjE1MTYsImV4cCI6MjA5MzUzNzUxNn0.YLTvVYzros14Q0qpTIvxZrXPLVoxSdk1EBunnTus-oA";
window.lc = window.supabase.createClient(window.LC_URL, window.LC_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "sasp.auth" }
});
