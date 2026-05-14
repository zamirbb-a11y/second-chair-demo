export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { caseText, documentText } = req.body;

    const prompt = `
אתה עורך דין ליטיגציה מסחרית בכיר בישראל.

נתח את המקרה הבא אך ורק בהקשר של:
- סעיף 15 לחוק החוזים (הטעיה)
- סעיף 21 לחוק החוזים (השבה לאחר ביטול)

החזר JSON בלבד בפורמט הבא:

{
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
            content: "אתה עורך דין ישראלי מומחה בדיני חוזים וליטיגציה מסחרית."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();

    const content = data.choices[0].message.content;

    return res.status(200).json(JSON.parse(content));

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Analysis failed"
    });
  }
}
