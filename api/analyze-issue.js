export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { issue, liveCaseState, caseText = "", documentText = "" } = req.body || {};

    if (!issue?.title) return res.status(400).json({ error: "Missing issue" });

    const prompt = `
אתה מבצע ניתוח ממוקד של מחלוקת אחת בלבד בתוך תיק ליטיגציה קיים.

**מחלוקת לניתוח:**
כותרת: ${issue.title}
תיאור: ${issue.description || "(לא סופק)"}

**מחלוקות קיימות בתיק (הקשר בלבד — אל תנתח אותן):**
${JSON.stringify(
  (liveCaseState?.issues || []).map((i) => ({
    id: i.id,
    title: i.title,
    importance: i.importance,
    strength: i.effectiveLegal?.strength,
  })),
  null,
  2
)}

**הערכת סיכויים כוללת:**
${JSON.stringify(liveCaseState?.successAssessment ?? null, null, 2)}

**טקסט התיק:**
${caseText}

**מסמכים:**
${documentText}

---

המטרה: נתח את המחלוקת הנ"ל בלבד מול חומר התיק.

כללים חיוניים:
- נתח את המחלוקת הנ"ל בלבד. אל תגע במחלוקות אחרות.
- אל תחזיר ניתוח מלא של התיק.
- אל תמציא עובדות שאינן בחומר שסופק.
- אם חומר התיק דל, הסתמך על תיאור המחלוקת עצמה ועל הגיון משפטי.
- claimantPosition ו-defendantPosition: ציין עמדות רק אם ניתן להסיק אותן מהחומר. אחרת השאר null.

החזר JSON בלבד:

{
  "legalAssessment": {
    "summary": "תיאור קצר של עוצמת המחלוקת והשאלות המשפטיות המרכזיות — 2-4 משפטים",
    "strength": "one of: very_strong | strong | medium_strong | medium | medium_weak | weak | very_weak | unclear"
  },
  "claimantPosition": "עמדת התובע ביחס למחלוקת זו, או null",
  "defendantPosition": "עמדת הנתבע ביחס למחלוקת זו, או null",
  "evidenceUpdates": [
    { "type": "new_evidence | document_impact", "title": "", "description": "" }
  ],
  "contradictions": [
    { "title": "", "description": "", "severity": "low | medium | high", "direction": "hurts_us | hurts_them | unclear", "targetType": "issue | evidence | claim | document_vs_claim | behavior_vs_claim | unknown" }
  ],
  "missingEvidence": [
    { "title": "", "description": "" }
  ],
  "generatedWorkItems": [
    { "type": "client_question | evidence_to_obtain | suggested_action | pleading_gap | legal_research", "title": "", "description": "", "reason": "", "priority": "low | medium | high" }
  ]
}

אם אין ממצאים בקטגוריה — החזר מערך ריק.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "אתה עורך דין ישראלי בכיר בליטיגציה מסחרית. תפקידך לנתח מחלוקת ספציפית אחת מול חומר תיק קיים. אל תחרוג מהמחלוקת שצוינה. החזר JSON תקין בלבד.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI analyze-issue failed:", data);
      return res.status(500).json({ error: "OpenAI request failed", details: data });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: "No content returned" });

    try {
      return res.status(200).json(JSON.parse(content));
    } catch {
      return res.status(500).json({ error: "Model returned invalid JSON", raw: content });
    }
  } catch (error) {
    console.error("analyze-issue failed:", error);
    return res.status(500).json({ error: "Analysis failed", details: error.message });
  }
}
