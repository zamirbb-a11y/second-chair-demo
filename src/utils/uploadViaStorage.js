import { supabase } from "../lib/supabaseClient";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — Supabase Storage limit

export async function uploadFileViaStorage(file, accessToken) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`הקובץ "${file.name}" גדול מדי — מקסימום 50MB.`);
  }

  // Step 1: get a signed upload URL from the server
  const urlRes = await fetch("/api/get-upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ filename: file.name }),
  });
  if (!urlRes.ok) {
    const body = await urlRes.json().catch(() => null);
    throw new Error(body?.error || `שגיאה בהכנת ההעלאה (${urlRes.status})`);
  }
  const { token, storagePath } = await urlRes.json();

  // Step 2: upload directly to Supabase Storage (bypasses Vercel completely)
  const { error: uploadErr } = await supabase.storage
    .from("case-documents")
    .uploadToSignedUrl(storagePath, token, file);
  if (uploadErr) throw new Error(`העלאה נכשלה: ${uploadErr.message}`);

  // Step 3: process the uploaded file (text extraction, profile, etc.)
  const procRes = await fetch("/api/process-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ storagePath }),
  });
  if (!procRes.ok) {
    const body = await procRes.json().catch(() => null);
    throw new Error(body?.error || `עיבוד הקובץ נכשל (${procRes.status})`);
  }
  const data = await procRes.json();
  return data.files?.[0] ?? null;
}

export async function uploadFilesViaStorage(files, accessToken) {
  return Promise.all(files.map((f) => uploadFileViaStorage(f, accessToken)));
}
