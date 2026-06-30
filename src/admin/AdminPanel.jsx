import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function buildEmailHtml(email, inviteUrl) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Georgia,serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;max-width:560px;">
        <tr><td style="background:#12172b;padding:28px 40px;text-align:left;">
          <p style="margin:0;color:#c8903a;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Georgia,serif;">Second Chair</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 4px;color:#c8903a;font-size:13px;font-family:Georgia,serif;">${email}</p>
          <p style="margin:0 0 28px;color:#12172b;font-size:20px;line-height:1.7;font-family:'Frank Ruhl Libre',Georgia,serif;">הוזמנת לנסות גרסת דמו של Second Chair &mdash; מערכת חדשה לניהול ליטיגציה מבוססת AI.</p>
          <img src="https://second-chair-demo.vercel.app/app-screenshot.png" alt="Second Chair" style="width:100%;max-width:480px;border-radius:4px;display:block;margin:0 auto 32px;" />
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
            <tr><td style="background:#12172b;border-radius:3px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 40px;color:#c8903a;font-family:Georgia,serif;font-size:15px;text-decoration:none;letter-spacing:0.5px;">כניסה</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#8aabb5;font-size:12px;text-align:center;font-family:Georgia,serif;">ההזמנה היא אישית ואינה ניתנת להעברה.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setStatus("loading");
    setCopied(false);
    setCopiedHtml(false);
    const email = inviteEmail.trim();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ error: json.error || "שגיאה ביצירת הקישור" });
      } else {
        setStatus({ sent: true, link: json.link, email });
        setInviteEmail("");
      }
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(status.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleCopyForGmail() {
    const html = buildEmailHtml(status.email, status.link);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) }),
      ]);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch {
      // Fallback: open in new tab for manual copy
      const w = window.open();
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <h1 className="text-2xl font-bold mb-1">ניהול מערכת</h1>
      <p className="text-sm text-slate-500 mb-8">כלי אדמין — לשימוש פנימי בלבד</p>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-1">הזמן משתמש</h2>
        <p className="text-sm text-slate-500 mb-4">הכנס כתובת אימייל לשליחת הזמנה.</p>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="כתובת אימייל"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-right outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            required
            dir="ltr"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {status === "loading" ? "..." : "שלח הזמנה"}
          </button>
        </form>

        {status?.sent && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-emerald-600">✓ ההזמנה נשלחה במייל</p>

            {/* Copy for Gmail */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-2">אם המייל לא הגיע — שלח ידנית מ-klag.co.il:</p>
              <button
                onClick={handleCopyForGmail}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer transition-colors"
              >
                {copiedHtml ? "✓ הועתק — פתח Gmail והדבק (Ctrl+V)" : "העתק הזמנה מעוצבת לגימייל"}
              </button>
            </div>

            {/* Backup raw link */}
            <div>
              <p className="text-xs text-slate-400 mb-1">לינק גולמי:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={status.link}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-left bg-white outline-none"
                  dir="ltr"
                  onClick={e => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  {copied ? "✓" : "העתק"}
                </button>
              </div>
            </div>
          </div>
        )}

        {status?.error && (
          <p className="mt-3 text-sm text-red-600">{status.error}</p>
        )}
      </div>

      <div className="mt-6 text-sm text-slate-400">
        <a href="/precedents" className="hover:text-slate-700 underline">מעבר לניהול מאגר פסיקה</a>
      </div>
    </div>
  );
}
