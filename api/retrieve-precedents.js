import precedentBank from "../src/legal-knowledge/precedents.json";
import { retrieveRelevantPrecedents } from "../src/lib/precedentRetrieval";

const MIN_ISSUE_TEXT_LENGTH = 10;
const MAX_RESULTS_CAP = 10;
const DEFAULT_MAX_RESULTS = 5;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { issueId = null, issueText = "", maxResults } = req.body || {};

  if (!issueText || issueText.trim().length < MIN_ISSUE_TEXT_LENGTH) {
    return res.status(200).json({ issueId, precedents: [] });
  }

  const limit = Math.min(
    typeof maxResults === "number" && maxResults > 0 ? maxResults : DEFAULT_MAX_RESULTS,
    MAX_RESULTS_CAP
  );

  const results = retrieveRelevantPrecedents(issueText.trim(), precedentBank, limit);

  const precedents = results.map((p) => ({
    id: p.id,
    caseNumber: p.caseNumber || null,
    shortName: p.shortName || p.title || null,
    helps: p.helps || null,
    miniRatio: p.miniRatio || null,
    retrievalScore: p.retrievalScore,
    retrievalReasons: p.retrievalReasons || [],
  }));

  return res.status(200).json({ issueId, precedents });
}
