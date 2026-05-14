export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { caseText, documentText } = req.body;

    const prompt = `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המטרה אינה לכתוב סיכום משפטי רגיל.
המטרה היא לבנות litigation cockpit לעורך דין: לזהות את התיק, את הסיכון, את החוסרים, ואת פעולות ההמשך.

התחום המשפטי מוגבל:
- סעיף 15 לחוק החוזים: הטעיה, לרבות אי-גילוי.
- סעיף 21 לחוק החוזים: השבה לאחר ביטול.
- פסיקה:
  1. ג.מ.ח.ל. — הטעיה נחלשת כשיש אדישות, היעדר הסתמכות או היעדר קשר סיבתי.
  2. אבו רקיה — הטעיה מתחזקת כשיש הסתרת פרטים מהותיים, יחסי אמון, ניגוד עניינים או חובת גילוי מוגברת.
  3. פסגות — רלוונטי לנטילת סיכון, טעות בכדאיות וסופיות הסכמות.

כללי ניתוח:
- אל תכתוב תשובה גנרית.
- אל תלמד את החוק.
- יישם את הדין על העובדות.
- ציין את העובדות הספציפיות שזיהית.
- אם יש מסמך התראה, סעיף ויתור, disclosure schedule, הודעת ביטול, רגולטור, תאריך או סכום — התייחס אליהם.
- זהה מה מחזק ומה מחליש.
- אל תמציא עובדות שלא נמסרו.
- כתוב בעברית משפטית ברורה, תמציתית וחדה.

החזר JSON בלבד, בלי Markdown, בדיוק במבנה הזה:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "High/Medium/Low",
  "caseSnapshot": {
    "parties": [],
    "coreDispute": "",
    "riskLevel": "High/Medium/Low",
    "issueFocus": ""
  },
  "timeline": [
    {
      "date": "",
      "event": "",
      "legalSignificance": ""
    }
  ],
  "mainLegalIssue": {
    "question": "",
    "whyItMatters": ""
  },
  "criticalIssues": [
    {
      "severity": "High/Medium/Low",
      "title": "",
      "analysis": ""
    }
  ],
  "evidenceMap": [
    {
      "issue": "",
      "existingEvidence": "",
      "missingEvidence": "",
      "risk": "High/Medium/Low"
    }
  ],
  "legalAnalysis": "",
  "counterArguments": [
    {
      "argument": "",
      "strength": "High/Medium/Low",
      "response": ""
    }
  ],
  "nextSteps": [
    ""
  ],
  "missingEvidence": [
    ""
  ]
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
              "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה חושב כמו ליטיגטור: עובדות, סיכונים, ראיות, חוסרים וצעדים הבאים."
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
      return res.status(500).json({
        error: "No content returned"
      });
    }

    const cleaned = content
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return res.status(200).json(JSON.parse(cleaned));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Analysis failed"
    });
  }
}
