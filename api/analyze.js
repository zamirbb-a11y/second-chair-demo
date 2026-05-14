export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { caseText, documentText } = req.body;

    const prompt = `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

המשימה:
נתח את המקרה כניתוח ראשוני לעורך דין, לא כסיכום כללי.

התחום מוגבל:
- סעיף 15 לחוק החוזים: הטעיה, לרבות אי-גילוי.
- סעיף 21 לחוק החוזים: השבה לאחר ביטול.
- פסיקה רלוונטית:
  1. ג.מ.ח.ל. — מדגישה שטענת הטעיה נחלשת כשיש אדישות, העדר הסתמכות או העדר קשר סיבתי.
  2. אבו רקיה — תומכת בטענת הטעיה כשיש הסתרת פרטים מהותיים, יחסי אמון, ניגוד עניינים או חובת גילוי מוגברת.
  3. פסגות — רלוונטית לטענות נגד של נטילת סיכון, טעות בכדאיות וסופיות הסכמות.

כללי כתיבה:
- אל תכתוב תשובה גנרית.
- אל תסכם את החוק באופן מופשט.
- נעץ את הניתוח בעובדות הספציפיות.
- זהה את בעלי העניין המרכזיים, גם אם לא ברור מי הלקוח.
- אם יש מכתב, הסכם, התראה, מצג, סעיף ויתור, מחיר, מועד או מסמך חסר — התייחס אליהם במפורש.
- כתוב כמו memo פנימי של ליטיגטור.
- ציין גם מה מחזק וגם מה מחליש.
- אל תמציא עובדות שלא מופיעות בקלט.
- אם משהו חסר, אמור מה חסר ולמה זה חשוב.

החזר JSON בלבד, בלי Markdown, בפורמט הזה:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "גבוהה/בינונית/נמוכה",
  "parties": "בעלי העניין המרכזיים והיחסים ביניהם",
  "timeline": "לוח זמנים עובדתי קצר, או ציין שאין מספיק מידע",
  "mainIssue": "השאלה המשפטית העיקרית, מנוסחת לפי עובדות המקרה",
  "analysis": "ניתוח משפטי עובדתי מעמיק לפי סעיף 15 וסעיף 21",
  "counterArgument": "טענת הנגד החזקה ביותר של הצד השני",
  "missingEvidence": "החוסרים הראייתיים המרכזיים ומה צריך להשלים"
}

תיאור המקרה:
${caseText}

המסמך:
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
              "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה כותב ניתוח חד, עובדתי ולא גנרי."
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
      return res.status(500).json({ error: "OpenAI request failed" });
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
    return res.status(500).json({
      error: "Analysis failed"
    });
  }
}
