import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

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

  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: "filename required" });

  const safe = filename.replace(/[^a-z0-9א-ת._\-]/gi, "_").slice(0, 120);
  const storagePath = `${user.id}/${Date.now()}_${safe}`;

  const { data, error } = await serviceClient.storage
    .from("case-documents")
    .createSignedUploadUrl(storagePath);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
}
