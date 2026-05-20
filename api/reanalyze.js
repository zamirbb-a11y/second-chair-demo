export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const startedAt = Date.now();

    const {
      previousAnalysis,
      workspaceUpdates = [],
      allowedIssues = [],
      caseText = "",
      documentText = "",
    } = req.body || {};

    const pendingUpdates = workspaceUpdates.filter(
      (update) => update.status === "pending_analysis"
    );

    if (!previousAnalysis) {
      return res.status(400).json({
        error: "Missing previousAnalysis",
      });
    }

    if (!pendingUpdates.length) {
return res.status(200).json({
  summary: "No pending updates to analyze.",
  impactedIssues: [],
  changedAssessments: [],
  evidenceUpdates: [],
  timelineUpdates: [],
  contradictions: [],
  suggestedActions: [],
generatedWorkItems: [],
});
    }

    const prompt = `
אתה לא מבצע ניתוח תיק מלא מחדש.

אתה מקבל:
1. ניתוח קודם של תיק ליטיגציה
2. רשימת עדכונים חדשים שנוספו ל-workspace
3. תיאור מקרה ומסמכים כרקע בלבד

המטרה:
להחזיר delta analysis בלבד — כלומר מה השתנה, מה הושפע, ומה צריך לבדוק בעקבות העדכונים.

אל תשכתב את כל הניתוח.
אל תחזיר executiveView מלא.
אל תחזיר caseTheory מלא.
אל תחזיר evidenceAndGaps מלא.

החזר JSON בלבד במבנה הבא:

{
  "summary": "",
  "impactedIssues": [
    {
      "issueId": "",
      "issueTitle": "",
      "impact": "",
      "direction": "strengthens | weakens | neutral | unclear",
      "reason": ""
    }
  ],
  "changedAssessments": [
    {
      "area": "",
      "previousAssessment": "",
      "newAssessment": "",
      "reason": ""
    }
  ],
  "evidenceUpdates": [
    {
      "type": "new_evidence | missing_evidence | evidence_gap | document_impact",
      "title": "",
      "description": "",
      "relatedIssueId": "",
      "relatedIssueTitle": "",
      "relatedUpdateId": ""
    }
  ],
  "timelineUpdates": [
    {
      "date": "",
      "event": "",
      "significance": "",
      "relatedUpdateId": ""
    }
  ],
  "contradictions": [
    {
      "title": "",
      "description": "",
      "severity": "low | medium | high",
      "relatedUpdateId": ""
    }
  ],
  "suggestedActions": [
    {
      "title": "",
      "description": "",
      "priority": "low | medium | high",
      "relatedUpdateId": ""
    }
  ],
  "generatedWorkItems": [
  {
    "type": "client_question | evidence_to_obtain | suggested_action | pleading_gap | legal_research",
    "title": "",
    "description": "",
    "reason": "",
    "relatedIssueId": "",
    "relatedIssueTitle": "",
    "sourceUpdateId": "",
    "priority": "low | medium | high"
  }
]
}

חוקי מחייבים לשדות relatedIssueId ו-issueId:
${
  allowedIssues.length > 0
    ? `רשימת המחלוקות המורשות (allowedIssues):
${JSON.stringify(allowedIssues, null, 2)}

IMPORTANT: בכל מקום שאתה ממלא relatedIssueId או issueId, חייב להיות אחד מה-id-ים ברשימה זו.
אל תמציא id-ים. אל תשנה את הפורמט. אם אין מחלוקת מתאימה ברורה, השאר את השדה ריק.`
    : "לא סופקה רשימת מחלוקות. השאר relatedIssueId ריק."
}

ניתוח קודם:
${JSON.stringify(previousAnalysis, null, 2)}

עדכונים חדשים:
${JSON.stringify(pendingUpdates, null, 2)}

רקע עובדתי כללי:
${caseText}

מסמכים / טקסט שחולץ:
${documentText}
`;

    console.log("Starting incremental reanalysis request");

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },

        body: JSON.stringify({
          model: "gpt-4.1",

          response_format: {
            type: "json_object",
          },

          messages: [
            {
              role: "system",
              content:
                "אתה עורך דין ישראלי בכיר בליטיגציה מסחרית. תפקידך לבצע reanalysis נקודתי בלבד על בסיס עדכונים חדשים בתיק קיים. אל תבצע ניתוח מלא מחדש. החזר JSON תקין בלבד.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.2,
        }),
      }
    );

    const data = await response.json();

    console.log(`Reanalysis completed in ${Date.now() - startedAt}ms`);

    if (!response.ok) {
      console.error("OpenAI reanalysis request failed:", data);

      return res.status(500).json({
        error: "OpenAI reanalysis request failed",
        details: data,
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "No content returned",
      });
    }

    try {
      const parsed = JSON.parse(content);

      return res.status(200).json({
        ...parsed,
        analyzedUpdateIds: pendingUpdates.map((update) => update.id),
      });
    } catch (parseError) {
      console.error("Failed to parse reanalysis JSON:", parseError);
      console.error("Raw model content:", content);

      return res.status(500).json({
        error: "Model returned invalid JSON",
        raw: content,
      });
    }
  } catch (error) {
    console.error("Reanalysis failed:", error);

    return res.status(500).json({
      error: "Reanalysis failed",
      details: error.message,
    });
  }
}