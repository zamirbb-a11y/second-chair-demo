"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handler;
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({
    error: "Method not allowed"
  });
  try {
    const {
      caseText = "",
      documentText = "",
      files = [],
      clientName = ""
    } = req.body || {};
    const fullText = [caseText, documentText, ...files.map(f => f?.text || "")].filter(Boolean).join("\n\n");
    if (!fullText.trim()) {
      return res.status(200).json({
        intakeQuestions: []
      });
    }
    const prompt = `
אתה עורך דין בכיר שקיבל חומר תיק ראשוני.

משימה כפולה:
א. זהה את שמות שני הצדדים העיקריים במחלוקת (מקסימום 2 שמות).
ב. זהה עד שלושה פריטי מידע חסרים שאם היינו מקבלים אותם לפני הניתוח, היו משנים באופן מהותי את איכותו.

כללים מחייבים:
1. התבסס אך ורק על החומר שנמסר — אל תמציא עובדות.
2. בחר רק מידע שחסרונו פוגע ממשית בניתוח הראשוני — לא שאלות רקע גנריות.
3. אם אין חוסרים משמעותיים — החזר intakeQuestions כמערך ריק.
4. לא יותר מ-3 פריטי שאלות.

חומר התיק:
${fullText.slice(0, 5000)}

החזר JSON בלבד:
{
  "detectedParties": ["שם הצד הראשון", "שם הצד השני"],
  "intakeQuestions": [
    {
      "question": "שאלה ספציפית ותמציתית",
      "whyItMatters": "הסבר קצר: למה המידע הזה ישנה את איכות הניתוח",
      "suggestedAction": "answer"
    }
  ]
}

הערות:
- detectedParties: שמות ספציפיים מהחומר, לא "תובע"/"נתבע". אם לא ניתן לזהות — מערך ריק.
- suggestedAction יכול להיות "answer", "upload_document", או "ask_client".
`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        response_format: {
          type: "json_object"
        },
        messages: [{
          role: "system",
          content: "אתה עורך דין ישראלי בכיר. זהה פערי מידע קריטיים לפני ניתוח תיק. החזר JSON תקין בלבד."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2
      })
    });
    if (!response.ok) {
      // On API failure, don't block the user — continue to analysis
      return res.status(200).json({
        intakeQuestions: []
      });
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(200).json({
      intakeQuestions: []
    });
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(200).json({
        intakeQuestions: []
      });
    }
    const questions = (parsed.intakeQuestions ?? []).slice(0, 3);
    const parties = (parsed.detectedParties ?? []).slice(0, 2);
    return res.status(200).json({
      intakeQuestions: questions,
      detectedParties: parties
    });
  } catch {
    // Never block the user — on any error, proceed to analysis
    return res.status(200).json({
      intakeQuestions: []
    });
  }
}
//# sourceMappingURL=pre-intake.js.map