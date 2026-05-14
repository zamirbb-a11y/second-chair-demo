export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { caseText, documentText } = req.body;

    const prompt = `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה: לבנות Litigation Cockpit לעורך דין, לא לכתוב חוות דעת ארוכה.

התחום מוגבל:
- סעיף 15 לחוק החוזים: הטעיה, לרבות אי-גילוי.
- סעיף 21 לחוק החוזים: השבה לאחר ביטול.
- פסיקה:
  1. ג.מ.ח.ל. — סיכון כאשר חסרים הסתמכות וקשר סיבתי.
  2. אבו רקיה — תומך כאשר יש הסתרת פרטים מהותיים, יחסי אמון, ניגוד עניינים או חובת גילוי מוגברת.
  3. פסגות — רלוונטי לטענות של נטילת סיכון, טעות בכדאיות וסופיות הסכמות.

כללי עבודה:
- אל תכתוב טקסט גנרי.
- אל תלמד את הדין.
- נעץ כל מסקנה בעובדות הספציפיות.
- השתמש ב-grounding קצר: "מבוסס על: ..." או "נשען על: ..."
- אל תמציא ציטוטים או סעיפים שלא הופיעו בקלט.
- צבעים/סיכון צריכים להיות מתונים: High / Medium / Low בלבד.
- כתוב בעברית משפטית חדה, תמציתית ומעשית.

החזר JSON בלבד, בלי Markdown, במבנה הבא:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "High/Medium/Low",

  "executiveView": {
    "caseSnapshot": {
      "parties": [],
      "coreDispute": "",
      "riskLevel": "High/Medium/Low",
      "issueFocus": "",
      "grounding": []
    },
    "criticalIssues": [
      {
        "severity": "High/Medium/Low",
        "title": "",
        "analysis": "",
        "grounding": []
      }
    ],
    "strategicAssessment": {
      "forClaimant": "",
      "forDefense": "",
      "mostLikelyBattleground": "",
      "grounding": []
    },
    "smokingGuns": [
      {
        "title": "",
        "whyItMatters": "",
        "grounding": []
      }
    ]
  },

  "caseTheory": {
    "claimantTheory": {
      "headline": "",
      "points": [],
      "grounding": []
    },
    "defenseTheory": {
      "headline": "",
      "points": [],
      "grounding": []
    },
    "litigationBattleground": {
      "issue": "",
      "why": "",
      "grounding": []
    }
  },

  "evidenceAndGaps": {
    "timeline": [
      {
        "date": "",
        "event": "",
        "legalSignificance": "",
        "grounding": []
      }
    ],
    "evidenceMap": [
      {
        "issue": "",
        "existingEvidence": "",
        "missingEvidence": "",
        "risk": "High/Medium/Low",
        "grounding": []
      }
    ],
    "missingEvidence": [],
    "keyDocuments": [
      {
        "name": "",
        "role": "",
        "grounding": []
      }
    ]
  },

  "actionCenter": {
    "nextSteps": [],
    "clientQuestions": [],
    "discoveryTargets": [],
    "draftingIdeas": []
  }
}

תיאור המקרה:
${caseText}

מסמך:
${documentText}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה בונה cockpit אסטרטגי: עובדות, ראיות, סיכונים, תיאוריות תיק וצעדים הבאים."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No content returned" });
    }

    const cleaned = content
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return res.status(200).json(JSON.parse(cleaned));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
