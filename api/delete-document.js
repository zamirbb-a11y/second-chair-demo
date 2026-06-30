import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "server misconfigured" });

  const serviceClient = createClient(
    "https://axwcgvvhirlfjgeuzspq.supabase.co",
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const jwt = req.headers.authorization?.replace("Bearer ", "");
  if (!jwt) return res.status(401).json({ error: "unauthorized" });

  const { data: { user }, error: authErr } = await serviceClient.auth.getUser(jwt);
  if (authErr || !user) return res.status(401).json({ error: "unauthorized" });

  const { storagePath } = req.body || {};
  if (!storagePath) return res.status(400).json({ error: "storagePath required" });

  if (!storagePath.startsWith(user.id + "/")) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { error: deleteErr } = await serviceClient.storage
    .from("case-documents")
    .remove([storagePath]);

  if (deleteErr) {
    console.error("[delete-document] error:", deleteErr.message);
    return res.status(500).json({ error: "delete failed" });
  }

  return res.status(200).json({ ok: true });
}
