"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handler;
var _precedents = _interopRequireDefault(require("../src/legal-knowledge/precedents.json"));
var _precedentRetrieval = require("../src/lib/precedentRetrieval");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const MIN_ISSUE_TEXT_LENGTH = 10;
const MAX_RESULTS_CAP = 10;
const DEFAULT_MAX_RESULTS = 5;
function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    issueId = null,
    issueText = "",
    maxResults
  } = req.body || {};
  if (!issueText || issueText.trim().length < MIN_ISSUE_TEXT_LENGTH) {
    return res.status(200).json({
      issueId,
      precedents: []
    });
  }
  const limit = Math.min(typeof maxResults === "number" && maxResults > 0 ? maxResults : DEFAULT_MAX_RESULTS, MAX_RESULTS_CAP);
  const results = (0, _precedentRetrieval.retrieveRelevantPrecedents)(issueText.trim(), _precedents.default, limit);
  const precedents = results.map(p => ({
    id: p.id,
    caseNumber: p.caseNumber || null,
    shortName: p.shortName || p.title || null,
    helps: p.helps || null,
    miniRatio: p.miniRatio || null,
    retrievalScore: p.retrievalScore,
    retrievalReasons: p.retrievalReasons || []
  }));
  return res.status(200).json({
    issueId,
    precedents
  });
}
//# sourceMappingURL=retrieve-precedents.js.map