import precedents from "../src/legal-knowledge/precedents.json";
import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt";
import contractFormationDefectsPack from "../src/legal-packs/contractFormationDefects";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const startedAt = Date.now();

    const {
      caseText,
      documentText,
      files = [],
    } = req.body;

const prompt =
  buildAnalyzePrompt({
    caseText,
    documentText,
    files,
    legalPacks: [
      contractFormationDefectsPack,
    ],
    precedents,
  });

    console.log(
      "Starting analysis request"
    );

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

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
                "אתה עורך דין ישראלי בכיר בדיני חוזים וליטיגציה מסחרית. אתה בונה cockpit ליטיגטורי: עובדות, ראיות, סיכונים, תיאוריות תיק, עילות רלוונטיות, סעדים וצעדים הבאים.",
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

    const data =
      await response.json();

    console.log(
      `Analysis completed in ${
        Date.now() - startedAt
      }ms`
    );

    if (!response.ok) {
      console.error(
        "OpenAI request failed:",
        data
      );

      return res.status(500).json({
        error:
          "OpenAI request failed",

        details: data,
      });
    }

    const content =
      data.choices?.[0]?.message
        ?.content;

    if (!content) {
      return res.status(500).json({
        error:
          "No content returned",
      });
    }

    try {
      const parsed =
        JSON.parse(content);

      return res
        .status(200)
        .json(parsed);
    } catch (parseError) {
      console.error(
        "Failed to parse model JSON:",
        parseError
      );

      console.error(
        "Raw model content:",
        content
      );

      return res.status(500).json({
        error:
          "Model returned invalid JSON",

        raw: content,
      });
    }
  } catch (error) {
    console.error(
      "Analysis failed:",
      error
    );

    return res.status(500).json({
      error: "Analysis failed",
    });
  }
}
