export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { caseText, documentText } = req.body;

    const prompt = `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

נתח את המקרה אך ורק בהקשר של:
- סעיף 15 לחוק החוזים
- סעיף 21 לחוק החוזים

כתוב ניתוח עובדתי ולא גנרי.
התייחס ישירות לעובדות.
זהה את בעלי העניין המרכזיים.
זהה את השאלה המשפטית המרכזית.
התייחס למסמכים, מצגים, מכתבים, סעיפי ויתור ואי־גילוי אם קיימים.

החזר JSON בלבד בפורמט הבא:

{
  "source": "OpenAI GPT-4.1-mini",
  "confidence": "",
  "parties": "",
  "timeline": "",
  "mainIssue": "",
  "analysis": "",
  "counterArgument": "",
  "missingEvidence": ""
}

תיאור המקרה:
${caseText}

מסמך:
${documentText}
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
                "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({
        error: "OpenAI request failed"
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
