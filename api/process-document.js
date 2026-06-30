import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { processFileBuffer } from "./upload.js";

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

  const { storagePath } = req.body || {};
  if (!storagePath) return res.status(400).json({ error: "storagePath required" });

  // Verify the file belongs to this user (path starts with their uid)
  if (!storagePath.startsWith(user.id + "/")) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { data: blob, error: downloadErr } = await serviceClient.storage
    .from("case-documents")
    .download(storagePath);

  if (downloadErr) {
    console.error("[process-document] download error:", downloadErr.message);
    return res.status(500).json({ error: "could not read file from storage" });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const filename = storagePath.split("/").pop().replace(/^\d+_/, ""); // strip timestamp prefix

  try {
    const processed = await processFileBuffer(buffer, filename);
    processed.storagePath = storagePath;
    return res.status(200).json({ files: [processed] });
  } catch (err) {
    console.error("[process-document] processing error:", err.message);
    return res.status(500).json({ error: "file processing failed" });
  }
}
