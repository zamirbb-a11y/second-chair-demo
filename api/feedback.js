export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, replyTo } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "server misconfigured" });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Second Chair <onboarding@resend.dev>",
      to: ["zamir.bb@gmail.com"],
      reply_to: replyTo || undefined,
      subject: "פידבק / בעיה ב-Second Chair",
      text: [
        replyTo ? `נשלח מ: ${replyTo}` : "נשלח מ: אנונימי",
        "",
        message.trim(),
      ].join("\n"),
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => null);
    console.error("[feedback] resend error:", err);
    return res.status(502).json({ error: "send failed" });
  }

  return res.status(200).json({ ok: true });
}
