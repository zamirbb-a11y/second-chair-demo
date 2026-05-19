import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt";
import contractLitigationCorePack from "../src/legal-packs/contractFormationDefects";
import precedentBank from "../src/legal-knowledge/precedents.json";
import { retrieveRelevantPrecedents } from "../src/lib/precedentRetrieval";

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

    const { caseText, documentText, files = [] } = req.body || {};

    const fullCaseText = [
      caseText,
      documentText,
      ...(files || []).map((file) => file?.text || ""),
    ]
      .filter(Boolean)
      .join("\n\n");

    const retrievedPrecedents = retrieveRelevantPrecedents(
      fullCaseText,
      precedentBank,
      6
    );

    console.log("Loaded precedents:", precedentBank.length);
    console.log(
      "Retrieved precedents:",
      retrievedPrecedents.map((p) => p.shortName || p.title)
    );

    const prompt = buildAnalyzePrompt({
      caseText,
      documentText,
      files,
      legalPacks: [contractLitigationCorePack],
      precedents: retrievedPrecedents,
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
          model: "gpt-4.1",

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

    try {
      const parsed = JSON.parse(content);

      return res.status(200).json({
        ...parsed,
        retrievedPrecedents,
      });
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