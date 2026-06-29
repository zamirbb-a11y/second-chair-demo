import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import nodemailer from "nodemailer";

config({ path: resolve(process.cwd(), ".env.local") });

function buildInviteEmail(email, inviteUrl) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>הזמנה ל-Second Chair</title>
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
          <p style="margin:0 0 4px;color:#c8903a;font-size:13px;letter-spacing:0.5px;font-family:Georgia,serif;">${email}</p>
          <p style="margin:0 0 28px;color:#12172b;font-size:20px;line-height:1.7;font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:400;">הוזמנת לנסות גרסת דמו של Second Chair &mdash; מערכת חדשה לניהול ליטיגציה מבוססת AI.</p>
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabaseUrl = "https://axwcgvvhirlfjgeuzspq.supabase.co";
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser   = process.env.GMAIL_USER;
  const gmailPass   = process.env.GMAIL_APP_PASSWORD;

  if (!serviceKey) return res.status(500).json({ error: "server misconfigured: service key missing" });
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "server misconfigured: gmail credentials missing" });

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const jwt = req.headers.authorization?.replace("Bearer ", "");
  if (!jwt) return res.status(401).json({ error: "unauthorized" });

  const { data: { user }, error: authErr } = await serviceClient.auth.getUser(jwt);
  if (authErr || !user) return res.status(401).json({ error: "unauthorized" });

  if (user.email !== process.env.INVITE_ADMIN_EMAIL) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { email } = req.body || {};
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "כתובת אימייל לא תקינה" });
  }

  const siteUrl = process.env.VITE_SITE_URL || "https://second-chair-demo.vercel.app";

  const { data, error: linkErr } = await serviceClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/landing.html` },
  });

  if (linkErr) {
    console.error("[invite-user] generateLink error:", JSON.stringify(linkErr));
    return res.status(400).json({ error: linkErr.message });
  }

  const inviteUrl = data?.properties?.action_link;
  if (!inviteUrl) {
    return res.status(500).json({ error: "לא הצלחנו ליצור קישור" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `"Second Chair" <${gmailUser}>`,
      to: email,
      subject: "הוזמנת ל-Second Chair",
      html: buildInviteEmail(email, inviteUrl),
    });
  } catch (mailErr) {
    console.error("[invite-user] mail error:", mailErr.message);
    return res.status(500).json({ error: "שליחת המייל נכשלה: " + mailErr.message });
  }

  console.log("[invite-user] invited:", email);
  return res.status(200).json({ success: true });
}
