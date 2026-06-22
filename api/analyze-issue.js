async function runAdversarialLoop(issue, caseText, firstResult, clientName, clientRole) {
  const isDefendant = clientRole === "defendant";
  const ourPosition = isDefendant ? firstResult.defendantPosition : firstResult.claimantPosition;
  const theirPosition = isDefendant ? firstResult.claimantPosition : firstResult.defendantPosition;
  const ourLabel = clientName || (isDefendant ? "הנתבע" : "התובע");
  const theirLabel = isDefendant ? "התובע" : "הנתבע";

  const adversarialPrompt = `
אתה עוה"ד של הצד שכנגד — אתה מייצג את ${theirLabel} ותפקידך לתקוף את עמדת ${ourLabel}.

**המחלוקת שנותחה:**
כותרת: ${issue.title}
תיאור: ${issue.description || "(לא סופק)"}

**הניתוח של ${ourLabel} (שאתה תוקף):**
הערכה: ${firstResult.legalAssessment?.summary || "לא סופקה"}
חוזק: ${firstResult.legalAssessment?.strength || "לא ידוע"}
עמדת ${ourLabel}: ${ourPosition || "לא סופקה"}
עמדת ${theirLabel}: ${theirPosition || "לא סופקה"}

**חומר גלם מהתיק:**
${caseText.slice(0, 2500)}

---

בצע red-team מקצועי. כללים:
1. אל תמציא עובדות — הישען רק על החומר שסופק.
2. זהה את ההנחה המרכזית שעליה נשענת העמדה ובחן אם היא מוצקה.
3. אם אין חולשה אמיתית בחומר הקיים — ציין זאת מפורשות ב-strongestAttack.
4. ספציפיות ולא גנריות.
5. אם החומר דל מכדי לתקוף, החזר impactOnAssessment: "no_change".

החזר JSON בלבד:
{
  "strongestAttack": "הטיעון החזק ביותר שהיריב יעלה — ספציפי",
  "vulnerableAssumptions": ["הנחה שניתן לקעקע"],
  "adverseEvidence": ["ראיה קיימת שסותרת"],
  "missingEvidenceThatMatters": ["ראיה קריטית שנעדרת ומחלישה"],
  "opposingCounselLikelyArgument": "הטיעון שעוה\"ד יריב יפתח איתו",
  "judgeConcern": "מה השופט עשוי לתהות לגבי העמדה",
  "impactOnAssessment": "no_change | slightly_weaker | materially_weaker | assessment_should_change",
  "recommendedNextStep": "פעולה אחת שעורך הדין צריך לעשות בגלל הממצאים"
}
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
            `אתה עורך דין ישראלי מנוסה המייצג את הצד שכנגד (${theirLabel}). תפקידך לתקוף את עמדת ${ourLabel} ולחשוף חולשות אמיתיות בלבד — לא להמציא. החזר JSON תקין בלבד.`,
        },
        { role: "user", content: adversarialPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) throw new Error("Adversarial call failed");
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No adversarial content returned");
  return JSON.parse(content);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { issue, liveCaseState, caseText = "", documentText = "", clientName = "", clientRole = "claimant", skipAdversarial = false } = req.body || {};

    if (!issue?.title) return res.status(400).json({ error: "Missing issue" });

    const isDefendantClient = clientRole === "defendant";
    const clientLabel = clientName || (isDefendantClient ? "הנתבע" : "התובע");
    const clientRoleLabel = isDefendantClient ? "הנתבע (הצד המגיב)" : "התובע (הצד שיזם את ההליך)";

    const prompt = `
אתה מבצע ניתוח ממוקד של מחלוקת אחת בלבד בתוך תיק ליטיגציה קיים.

**הלקוח שלנו:** ${clientLabel} — ${clientRoleLabel}.
כל הערכת legalAssessment.strength תשקף את סיכויי ${clientLabel} לנצח בטענה זו.

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
    "strength": "סיכויי הטענה מנקודת מבט הלקוח: very_strong | strong | medium_strong | medium | medium_weak | weak | very_weak | unclear"
  },
  "claimantPosition": "2-3 משפטים המתארים את טענות הצד שיזם את ההליך ביחס למחלוקת זו. השתמש בשם הצד האמיתי ולא במילה 'תובע'. החזר null אם אין מספיק מידע.",
  "defendantPosition": "2-3 משפטים המתארים את טענות הצד המגיב ביחס למחלוקת זו. השתמש בשם הצד האמיתי ולא במילה 'נתבע'. החזר null אם אין מספיק מידע.",
  "evidenceUpdates": [
    { "type": "new_evidence | document_impact", "title": "", "description": "", "benefitsParty": "claimant | defendant | both" }
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
עבור כל evidenceUpdate — ציין benefitsParty: "claimant" אם הראיה מחזקת את עמדת התובע, "defendant" אם מחזקת את הנתבע, "both" אם תומכת בשני הצדדים.
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

    let firstResult;
    try {
      firstResult = JSON.parse(content);
    } catch {
      return res.status(500).json({ error: "Model returned invalid JSON", raw: content });
    }

    let adversarialReview = null;
    if (!skipAdversarial) {
      try {
        adversarialReview = await runAdversarialLoop(issue, caseText, firstResult, clientName, clientRole);
      } catch {
        // Silent fail — first result is complete without adversarial review
      }
    }

    return res.status(200).json({ ...firstResult, adversarialReview });
  } catch (error) {
    console.error("analyze-issue failed:", error);
    return res.status(500).json({ error: "Analysis failed", details: error.message });
  }
}
