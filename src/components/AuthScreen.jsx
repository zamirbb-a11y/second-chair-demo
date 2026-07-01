import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthScreen({ isModal = false, initialMode = "login", paywallMode = false, onDone }) {
  const [mode, setMode]       = useState(initialMode);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(translateError(error.message));
    else if (onDone) onDone();
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName.trim() } },
    });
    setLoading(false);
    if (error) setError(translateError(error.message));
    else setMode("check-email");
  }

  const isLogin = mode === "login";

  const card = mode === "check-email" ? (
    <div dir="rtl" className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-4 text-center">
      <div className="text-4xl">✉️</div>
      <h2 className="text-xl font-bold text-slate-900">בדוק את תיבת הדואר שלך</h2>
      <p className="text-sm text-slate-500">שלחנו קישור אימות לכתובת <strong>{email}</strong>. לחץ עליו כדי להפעיל את החשבון.</p>
      <button
        onClick={() => setMode("login")}
        className="text-sm text-indigo-600 hover:underline cursor-pointer bg-transparent border-0"
      >
        חזור למסך הכניסה
      </button>
    </div>
  ) : (
    <div dir="rtl" className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Second Chair</h1>
        <p className="text-sm text-slate-500">{isLogin ? "כניסה לחשבון" : "יצירת חשבון חדש"}</p>
      </div>

      <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-3">
        {!isLogin && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="שם מלא"
            required
            autoFocus
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="כתובת אימייל"
          required
          autoFocus={isLogin}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          required
          minLength={6}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
        />

        {error && (
          <p className="text-sm text-red-600 text-right px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-slate-900 py-3 text-white font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer border-0"
        >
          {loading ? "..." : isLogin ? "כניסה" : "הרשמה"}
        </button>
      </form>

      {!paywallMode && (
        <p className="text-center text-sm text-slate-500">
          {isLogin ? "אין לך חשבון עדיין?" : "יש לך כבר חשבון?"}{" "}
          <button
            onClick={() => { setMode(isLogin ? "signup" : "login"); setError(""); }}
            className="text-indigo-600 font-semibold hover:underline cursor-pointer bg-transparent border-0"
          >
            {isLogin ? "הרשמה" : "כניסה"}
          </button>
        </p>
      )}
      {paywallMode && (
        <p className="text-center text-xs text-slate-400">גישה למערכת בהזמנה בלבד</p>
      )}
    </div>
  );

  if (isModal) {
    const overlay = onDone ? "bg-slate-900/60 backdrop-blur-sm" : "bg-slate-900/25 backdrop-blur-[3px]";
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 ${overlay}`}>
        {onDone && (
          <div className="w-full max-w-md flex justify-end mb-2">
            <button onClick={onDone} className="text-white/60 hover:text-white text-xl bg-transparent border-0 cursor-pointer">✕</button>
          </div>
        )}
        {paywallMode && (
          <div className="text-center mb-5">
            <p className="text-white text-xl font-bold mb-1">הניתוח מוכן</p>
            <p className="text-white/60 text-sm">כנס לחשבון שלך כדי לצפות בתוצאות</p>
          </div>
        )}
        {card}
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#eef4fb] flex items-center justify-center p-6">
      {card}
    </div>
  );
}

function translateError(msg) {
  if (msg.includes("Invalid login credentials")) return "אימייל או סיסמה שגויים";
  if (msg.includes("Email not confirmed"))       return "יש לאשר את האימייל לפני הכניסה";
  if (msg.includes("User already registered"))   return "כתובת האימייל כבר רשומה במערכת";
  if (msg.includes("Password should be"))        return "הסיסמה חייבת להכיל לפחות 6 תווים";
  if (msg.includes("rate limit"))                return "יותר מדי ניסיונות — נסה שוב בעוד מספר דקות";
  return msg;
}
