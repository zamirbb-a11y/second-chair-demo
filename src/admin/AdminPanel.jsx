import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null); // null | "sending" | "sent" | { error }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteStatus({ error: json.error || "שגיאה בשליחת ההזמנה" });
      } else {
        setInviteStatus("sent");
        setInviteEmail("");
        setTimeout(() => setInviteStatus(null), 4000);
      }
    } catch (err) {
      setInviteStatus({ error: err.message });
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <h1 className="text-2xl font-bold mb-1">ניהול מערכת</h1>
      <p className="text-sm text-slate-500 mb-8">כלי אדמין — לשימוש פנימי בלבד</p>

      {/* Invite users */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg">
        <h2 className="text-base font-semibold mb-1">הזמן משתמש</h2>
        <p className="text-sm text-slate-500 mb-4">
          המשתמש יקבל מייל עם קישור כניסה ויובל לדף הנחיתה.
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
            disabled={inviteStatus === "sending"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {inviteStatus === "sending" ? "שולח..." : "שלח הזמנה"}
          </button>
        </form>
        {inviteStatus === "sent" && (
          <p className="mt-3 text-sm text-emerald-600">✓ ההזמנה נשלחה בהצלחה</p>
        )}
        {inviteStatus?.error && (
          <p className="mt-3 text-sm text-red-600">{inviteStatus.error}</p>
        )}
      </div>

      <div className="mt-6 text-sm text-slate-400">
        <a href="/precedents" className="hover:text-slate-700 underline">מעבר לניהול מאגר פסיקה</a>
      </div>
    </div>
  );
}
