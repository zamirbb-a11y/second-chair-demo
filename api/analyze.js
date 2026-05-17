import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt";
import contractFormationDefectsPack from "../src/legal-packs/contractFormationDefects";
import {
  retrieveRelevantPrecedents,
  formatPrecedentsForPrompt,
} from "../src/lib/precedentRetrieval";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const startedAt = Date.now();

    const {
      caseText = "",
      documentText = "",
      precedents = [],
    } = req.body;

    const fullCaseText = [caseText, documentText]
      .filter(Boolean)
      .join("\n\n");

    const relevantPrecedents = retrieveRelevantPrecedents(
      fullCaseText,
      precedents,
      6
    );

    const legalSourcesForPrompt =
      formatPrecedentsForPrompt(relevantPrecedents);

    const prompt = buildAnalyzePrompt({
      caseText,
      documentText,
      legalPacks: [contractFormationDefectsPack],
      legalSourcesForPrompt,
    });

   console.log("Starting analysis request");
console.log("OPENAI_API_KEY exists:", Boolean(process.env.OPENAI_API_KEY));
console.log("OPENAI_API_KEY prefix:", process.env.OPENAI_API_KEY?.slice(0, 7));
    console.log(
      `Retrieved ${relevantPrecedents.length} relevant precedents`
    );

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

  response_format: {
    type: "json_object",
  },

  messages: [
            {
              role: "system",
              content:
                "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה בונה cockpit ליטיגטורי: עובדות, ראיות, סיכונים, תיאוריות תיק, עילות רלוונטיות, סעדים וצעדים הבאים. כאשר מסופקים לך מקורות משפטיים פנימיים, השתמש בהם בלבד כמקורות פסיקה. אל תמציא פסיקה. אם אין מקור מתאים, כתוב שחסר מקור משפטי מתאים במאגר.",
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

    console.log(`Analysis completed in ${Date.now() - startedAt}ms`);

    if (!response.ok) {
      console.error("OpenAI request failed:", data);

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

    try {
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON object found in model response");
      }

      const jsonText = cleaned.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonText);

      parsed.retrievedPrecedents = relevantPrecedents.map((p) => ({
        id: p.id,
        title: p.title,
        shortName: p.shortName,
        court: p.court,
        helps: p.helps,
        retrievalScore: p.retrievalScore,
        retrievalReasons: p.retrievalReasons,
      }));

      return res.status(200).json(parsed);
    } catch (parseError) {
      console.error("Failed to parse model JSON:", parseError);
      console.error("Raw model content:", content);

      return res.status(500).json({
        error: "Model returned invalid JSON",
        raw: content,
      });
    }
  } catch (error) {
    console.error("Analysis failed:", error);

    return res.status(500).json({
      error: "Analysis failed",
      details: error.message,
    });
  }
}