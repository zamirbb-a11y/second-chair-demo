import { retrieveRelevantPrecedents } from "../src/lib/precedentRetrieval";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      caseText = "",
      documentText = "",
      precedents = [],
    } = req.body || {};

    const fullCaseText = [caseText, documentText]
      .filter(Boolean)
      .join("\n\n");

    const retrievedPrecedents = retrieveRelevantPrecedents(
      fullCaseText,
      precedents,
      6
    );

    console.log(
      `Retrieved ${retrievedPrecedents.length} relevant precedents`
    );

    return res.status(200).json({
      precedents: retrievedPrecedents.map((p) => ({
        id: p.id,
        title: p.title,
        shortName: p.shortName,
        court: p.court,
        helps: p.helps,
        retrievalScore: p.retrievalScore,
        retrievalReasons: p.retrievalReasons,
        issues: p.issues,
        holding: p.holding,
        risks: p.risks,
        miniRatio: p.miniRatio,
      })),
    });
  } catch (error) {
    console.error("Precedent retrieval failed:", error);

    return res.status(500).json({
      error: "Precedent retrieval failed",
      details: error.message,
    });
  }
}
