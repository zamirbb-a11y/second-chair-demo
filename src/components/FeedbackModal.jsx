import { useState } from "react";

export default function FeedbackModal({ onClose, userEmail }) {
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(userEmail || "");
  const [state, setState] = useState("idle"); // idle | sending | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), replyTo: replyTo.trim() || undefined }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-800">פידבק / דיווח על בעיה</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none bg-transparent border-0 cursor-pointer"
          >
            ×
          </button>
        </div>

        {state === "done" ? (
          <div className="py-6 text-center">
            <div className="text-3xl mb-3">✓</div>
            <p className="text-slate-700 font-medium">ההודעה נשלחה בהצלחה.</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-slate-900 text-white px-5 py-2 text-sm font-semibold cursor-pointer border-0"
            >
              סגור
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="תאר את הבעיה או ההצעה..."
              rows={5}
              required
              className="w-full text-[13px] border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-400 resize-none leading-relaxed"
            />
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="אימייל לתשובה (אופציונלי)"
              className="w-full text-[13px] border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-400"
            />
            {state === "error" && (
              <p className="text-red-600 text-[12px]">שליחה נכשלה — נסה שוב.</p>
            )}
            <div className="flex gap-2 justify-start">
              <button
                type="submit"
                disabled={state === "sending" || !message.trim()}
                className="rounded-lg bg-slate-900 text-white px-5 py-2 text-[13px] font-semibold disabled:opacity-40 cursor-pointer border-0 hover:bg-slate-800"
              >
                {state === "sending" ? "שולח..." : "שלח"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-[13px] text-slate-600 cursor-pointer hover:bg-slate-50"
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
