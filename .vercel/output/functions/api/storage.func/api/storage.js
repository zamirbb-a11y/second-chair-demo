"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handler;
var _supabaseJs = require("@supabase/supabase-js");
var _dotenv = require("dotenv");
var _path = require("path");
var _processFile = require("../src/lib/processFile.js");
(0, _dotenv.config)({
  path: (0, _path.resolve)(process.cwd(), ".env.local")
});
const SUPABASE_URL = "https://axwcgvvhirlfjgeuzspq.supabase.co";
function makeServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return (0, _supabaseJs.createClient)(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
async function getUser(serviceClient, req) {
  const jwt = req.headers.authorization?.replace("Bearer ", "");
  if (!jwt) return null;
  const {
    data: {
      user
    },
    error
  } = await serviceClient.auth.getUser(jwt);
  return error ? null : user;
}
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const serviceClient = makeServiceClient();
  if (!serviceClient) return res.status(500).json({
    error: "server misconfigured"
  });
  const user = await getUser(serviceClient, req);
  if (!user) return res.status(401).json({
    error: "unauthorized"
  });
  const {
    action,
    filename,
    storagePath
  } = req.body || {};

  // ── Get signed upload URL ──────────────────────────────────────
  if (action === "get-url") {
    if (!filename) return res.status(400).json({
      error: "filename required"
    });
    const safe = filename.replace(/[^a-z0-9א-ת._\-]/gi, "_").slice(0, 120);
    const path = `${user.id}/${Date.now()}_${safe}`;
    const {
      data,
      error
    } = await serviceClient.storage.from("case-documents").createSignedUploadUrl(path);
    if (error) return res.status(500).json({
      error: error.message
    });
    return res.status(200).json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath: path
    });
  }

  // ── Process uploaded file ──────────────────────────────────────
  if (action === "process") {
    if (!storagePath) return res.status(400).json({
      error: "storagePath required"
    });
    if (!storagePath.startsWith(user.id + "/")) return res.status(403).json({
      error: "forbidden"
    });
    const {
      data: blob,
      error: downloadErr
    } = await serviceClient.storage.from("case-documents").download(storagePath);
    if (downloadErr) {
      console.error("[storage/process] download error:", downloadErr.message);
      return res.status(500).json({
        error: "could not read file from storage"
      });
    }
    try {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const filename = storagePath.split("/").pop().replace(/^\d+_/, "");
      const processed = await (0, _processFile.processFileBuffer)(buffer, filename);
      processed.storagePath = storagePath;
      return res.status(200).json({
        files: [processed]
      });
    } catch (err) {
      console.error("[storage/process] processing error:", err.message);
      return res.status(500).json({
        error: "file processing failed"
      });
    }
  }

  // ── Delete file ────────────────────────────────────────────────
  if (action === "delete") {
    if (!storagePath) return res.status(400).json({
      error: "storagePath required"
    });
    if (!storagePath.startsWith(user.id + "/")) return res.status(403).json({
      error: "forbidden"
    });
    const {
      error: deleteErr
    } = await serviceClient.storage.from("case-documents").remove([storagePath]);
    if (deleteErr) {
      console.error("[storage/delete] error:", deleteErr.message);
      return res.status(500).json({
        error: "delete failed"
      });
    }
    return res.status(200).json({
      ok: true
    });
  }
  return res.status(400).json({
    error: "invalid action"
  });
}
//# sourceMappingURL=storage.js.map