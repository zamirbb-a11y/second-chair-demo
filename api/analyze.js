import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt";
import contractFormationDefectsPack from "../src/legal-packs/contractFormationDefects";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const startedAt = Date.now();

    const { caseText, documentText } = req.body;

    const prompt = buildAnalyzePrompt({
      caseText,
      documentText,
      legalPacks: [contractFormationDefectsPack],
    });

    console.log("Starting analysis request");

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
                "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה בונה cockpit ליטיגטורי: עובדות, ראיות, סיכונים, תיאוריות תיק, עילות רלוונטיות, סעדים וצעדים הבאים.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 2500,
        }),
      }
    );

    const data = await response.json();

    console.log(`Analysis completed in ${Date.now() - startedAt}ms`);

    if (!response.ok) {
      console.error(data);

      return res.status(500).json({
        error: "OpenAI request failed",
        details: data,
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "No content returned",
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
      error: "Analysis failed",
    });
  }
}
