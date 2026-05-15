import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt.js";
import contractFormationDefectsPack from "../src/legal-packs/contractFormationDefects.js";
import missingEvidenceHeuristics from "../src/legal-knowledge/missingEvidenceHeuristics.js";

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
      missingEvidenceHeuristics,
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

    const data = await response.json();

    console.log(`Analysis completed in ${Date.now() - startedAt}ms`);

    if (!response.ok) {
      console.error("OpenAI request failed:", data);

      return res
        .status(200)
        .json(fallbackAnalysis("OpenAI request failed"));
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res
        .status(200)
        .json(fallbackAnalysis("No content returned"));
    }

    try {
      const parsed = JSON.parse(content);

      return res.status(200).json(parsed);
    } catch (parseError) {
      console.error("Failed to parse model JSON:", parseError);

      console.error(
        "Raw model content:",
        content?.slice(0, 4000)
      );

      return res
        .status(200)
        .json(
          fallbackAnalysis("Model returned invalid JSON")
        );
    }
  } catch (error) {
    console.error("Analysis failed:", error);

    return res
      .status(200)
      .json(fallbackAnalysis("Analysis failed"));
  }
}

function fallbackAnalysis(errorMessage = "Analysis failed") {
  return {
    source: "Fallback",
    confidence: "Low",

    executiveView: {
      caseSnapshot: {
        parties: [],
        coreDispute: "הניתוח נכשל טכנית. יש לבדוק את הלוג.",
        riskLevel: "Low",
        issueFocus: errorMessage,
        grounding: [],
      },

      criticalIssues: [],

      strategicAssessment: {
        forClaimant: "",
        forDefense: "",
        mostLikelyBattleground: "",
        grounding: [],
      },

      smokingGuns: [],
    },

    caseTheory: {
      claimantTheory: {
        headline: "",
        points: [],
        grounding: [],
      },

      defenseTheory: {
        headline: "",
        points: [],
        grounding: [],
      },

      litigationBattleground: {
        issue: "",
        why: "",
        grounding: [],
      },
    },

    evidenceAndGaps: {
      timeline: [],
      evidenceMap: [],
      missingEvidence: [],
      keyDocuments: [],
    },

    actionCenter: {
      nextSteps: [],
      clientQuestions: [],
      discoveryTargets: [],
      draftingIdeas: [],
    },
  };
}
