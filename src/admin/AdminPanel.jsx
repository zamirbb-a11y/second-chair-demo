import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | { link } | { error }
  const [copied, setCopied] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setStatus("loading");
    setCopied(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ error: json.error || "שגיאה ביצירת הקישור" });
      } else {
        setStatus({ link: json.link });
        setInviteEmail("");
      }
    } catch (err) {
      setStatus({ error: err.message });
    }
  }

  function handleCopy() {
    if (!status?.link) return;
    navigator.clipboard.writeText(status.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <h1 className="text-2xl font-bold mb-1">ניהול מערכת</h1>
      <p className="text-sm text-slate-500 mb-8">כלי אדמין — לשימוש פנימי בלבד</p>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-1">הזמן משתמש</h2>
        <p className="text-sm text-slate-500 mb-4">
          הכנס כתובת אימייל וקבל קישור הזמנה לשליחה ידנית.
        </p>
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
            {status === "loading" ? "..." : "צור קישור"}
          </button>
        </form>

        {status?.link && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-1">קישור הזמנה — שלח למשתמש בכל אמצעי:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={status.link}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-left bg-slate-50 outline-none"
                dir="ltr"
                onClick={e => e.target.select()}
              />
              <button
                onClick={handleCopy}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                {copied ? "✓ הועתק" : "העתק"}
              </button>
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
