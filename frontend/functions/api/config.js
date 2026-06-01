// Cloudflare Pages Function — exposes runtime config to the browser.
// Reads from environment variables set in the Pages dashboard, so secrets
// and URLs never live in the repo. Values served here are still visible
// to anyone who loads the site (the anon key is meant to be public; it's
// scoped by Supabase RLS), but they are not committed to git.
export function onRequestGet({ env }) {
  const body = {
    SUPABASE_URL:      env.SUPABASE_URL      ?? "",
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? "",
    BACKEND_URL:       env.BACKEND_URL       ?? "",
    EMAIL_DOMAINS: (env.EMAIL_DOMAINS ?? "alustudent.com,aluedu.org")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  };
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
