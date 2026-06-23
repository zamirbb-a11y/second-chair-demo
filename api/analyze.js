import buildAnalyzePrompt from "../src/prompts/buildAnalyzePrompt";
import contractLitigationCorePack from "../src/legal-packs/contractFormationDefects";
import precedentBank from "../src/legal-knowledge/precedents.json";
import { retrieveRelevantPrecedents } from "../src/lib/precedentRetrieval";

async function runAdversarialPass(issues, caseText, clientName, clientRole) {
  if (!issues?.length) return {};

  const isDefendant = clientRole === "defendant";
  const clientLabel = clientName || (isDefendant ? "הנתבע" : "התובע");
  const theirLabel  = isDefendant ? "התובע" : "הנתבע";

  const issuesSummary = issues.map(i => ({
    id: i.id,
    title: i.title,
    legalAssessment: i.legalAssessment,
    ourPosition:   isDefendant ? i.partyPositions?.defendant : i.partyPositions?.claimant,
    theirPosition: isDefendant ? i.partyPositions?.claimant  : i.partyPositions?.defendant,
  }));

  const prompt = `
אתה עורך דין יריב ישראלי המייצג את ${theirLabel} ומנסה לנצח את ${clientLabel}.

בצע red-team מקצועי על כל אחת מהמחלוקות הבאות.
כללים:
1. אל תמציא עובדות — הישען רק על החומר שסופק.
2. ספציפי לעובדות, לא גנרי.
3. אם אין חולשה אמיתית — החזר impactOnAssessment: "no_change".
4. זהה גם את הטיעון החזק ביותר לטובת ${clientLabel} בכל מחלוקת — הנקודה שקשה ביותר לתקוף.

מחלוקות:
${JSON.stringify(issuesSummary, null, 2)}

חומר מהתיק:
${caseText.slice(0, 3000)}

החזר JSON בלבד — מפתח לפי id של כל מחלוקת:
{
  "<issueId>": {
    "strongestArgument": "הטיעון החזק ביותר לטובת ${clientLabel} — הנקודה שקשה לי (כצד התוקף) לתקוף",
    "strongestAttack": "הטיעון החזק ביותר שאני מעלה כנגד ${clientLabel} — ספציפי לעובדות",
    "vulnerableAssumptions": ["הנחה שניתן לקעקע"],
    "adverseEvidence": ["ראיה קיימת שסותרת"],
    "missingEvidenceThatMatters": ["ראיה חסרה שמחלישה"],
    "opposingCounselLikelyArgument": "הטיעון הפותח שלי כנגד ${clientLabel}: [מה שאני, כעוה\"ד של הצד שכנגד, אפתח איתו]",
    "judgeConcern": "מה השופט עשוי לתהות",
    "impactOnAssessment": "no_change | slightly_weaker | materially_weaker | assessment_should_change",
    "recommendedNextStep": "פעולה אחת שעורך הדין צריך לעשות"
  }
}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `אתה עורך דין יריב ישראלי מנוסה. תפקידך לתקוף את עמדת ${clientLabel} בכל מחלוקת ולחשוף חולשות אמיתיות בלבד. החזר JSON תקין בלבד.` },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) throw new Error("Adversarial pass failed");
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No adversarial content");
  return JSON.parse(content);
}

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

    const { caseText, documentText, files = [], clientName = "" } = req.body || {};

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
      clientName,
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

      // Merge GPT's contextual selection (caseLaw.retrievedPrecedents) with
      // bank data for rich tooltips. GPT decides relevance and which side is
      // helped; the bank provides claimantUse/defenseUse/miniRatio.
      const gptPrecedents = parsed.caseLaw?.retrievedPrecedents ?? [];
      const mergedPrecedents = gptPrecedents
        .map((gptP) => {
          const bankMatch =
            precedentBank.find(
              (b) => b.caseNumber && gptP.caseNumber && b.caseNumber === gptP.caseNumber
            ) ??
            precedentBank.find(
              (b) =>
                gptP.name &&
                (b.shortName?.toLowerCase() === gptP.name.toLowerCase() ||
                  b.title?.toLowerCase().includes(gptP.name.toLowerCase()))
            );

          if (bankMatch) {
            return {
              ...bankMatch,
              helps: gptP.helps ?? bankMatch.helps,
              relevance: gptP.relevance,
              useInLitigation: gptP.useInLitigation,
              relatedIssueIds: gptP.relatedIssueIds ?? [],
            };
          }

          // GPT selected a case not in the bank — use GPT data only
          return {
            shortName: gptP.name ?? gptP.caseNumber ?? "",
            title: gptP.name ?? "",
            caseNumber: gptP.caseNumber ?? "",
            helps: gptP.helps ?? "Mixed",
            miniRatio: gptP.relevance ?? "",
            claimantUse: gptP.useInLitigation ?? "",
            defenseUse: gptP.useInLitigation ?? "",
            relatedIssueIds: gptP.relatedIssueIds ?? [],
          };
        })
        .filter((p) => p.shortName || p.title || p.caseNumber);

      console.log(
        "Merged precedents:",
        mergedPrecedents.map((p) => `${p.shortName} (${p.helps})`)
      );

      const effectiveClientRole = parsed.clientRole ?? "claimant";

      let adversarialReviews = {};
      try {
        adversarialReviews = await runAdversarialPass(
          parsed.issues ?? [],
          caseText,
          clientName,
          effectiveClientRole
        );
      } catch (e) {
        console.warn("Adversarial pass failed (silent):", e.message);
      }

      return res.status(200).json({
        ...parsed,
        clientRole: effectiveClientRole,
        retrievedPrecedents: mergedPrecedents,
        adversarialReviews,
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