import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabaseUrl = "https://axwcgvvhirlfjgeuzspq.supabase.co";
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[invite-user] env keys:", Object.keys(process.env).filter(k => k.includes("SUPA") || k.includes("INVITE")));
  console.log("[invite-user] serviceKey present:", !!serviceKey);
  if (!serviceKey) {
    console.error("[invite-user] missing SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "server misconfigured" });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is an authenticated admin
  const jwt = req.headers.authorization?.replace("Bearer ", "");
  if (!jwt) return res.status(401).json({ error: "unauthorized" });

  const { data: { user }, error: authErr } = await serviceClient.auth.getUser(jwt);
  if (authErr || !user) return res.status(401).json({ error: "unauthorized" });

  if (user.email !== process.env.INVITE_ADMIN_EMAIL) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { email } = req.body || {};
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "כתובת אימייל לא תקינה" });
  }

  const siteUrl = process.env.VITE_SITE_URL || "http://localhost:3005";

  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/landing.html`,
  });

  if (error) {
    console.error("[invite-user] error:", error.message);
    return res.status(400).json({ error: error.message });
  }

  console.log("[invite-user] invited:", email);
  return res.status(200).json({ success: true });
}
