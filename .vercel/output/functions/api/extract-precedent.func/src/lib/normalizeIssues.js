"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeIssues = normalizeIssues;
const issueTaxonomy = [{
  id: "contract.formation",
  synonyms: ["כריתה", "גמירות דעת", "מסוימות", "הצעה", "קיבול"]
}, {
  id: "contract.negotiation.goodFaith",
  synonyms: ["משא ומתן", "מו״מ", 'מו"מ', "תום לב", "סעיף 12"]
}, {
  id: "contract.defects.misrepresentation",
  synonyms: ["הטעיה", "מצג שווא", "אי גילוי", "חובת גילוי", "סעיף 15"]
}, {
  id: "contract.defects.mistake",
  synonyms: ["טעות", "סעיף 14"]
}, {
  id: "contract.defects.duressUnconscionability",
  synonyms: ["כפייה", "עושק", "לחץ", "סעיף 17", "סעיף 18"]
}, {
  id: "contract.interpretation",
  synonyms: ["פרשנות", "אומד דעת", "לשון החוזה", "תכלית", "אפרופים", "ביבי כבישים"]
}, {
  id: "contract.breach",
  synonyms: ["הפרה", "הפרת הסכם", "אי קיום", "חיוב"]
}, {
  id: "contract.remedies.enforcement",
  synonyms: ["אכיפה", "צו אכיפה", "סעד האכיפה"]
}, {
  id: "contract.remedies.rescissionRestitution",
  synonyms: ["ביטול", "השבה", "ביטול חוזה", "סעד הביטול"]
}, {
  id: "contract.remedies.damages",
  synonyms: ["פיצויים", "נזק", "אובדן רווח", "פיצויי קיום", "פיצויי הסתמכות"]
}, {
  id: "contract.frustration",
  synonyms: ["סיכול", "כוח עליון", "סעיף 18 לחוק התרופות"]
}, {
  id: "contract.standardContracts",
  synonyms: ["חוזה אחיד", "תניית פטור", "תנאי מקפח"]
}];
function toTextList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}
function normalizeIssues(rawIssues = []) {
  const normalized = new Set();
  for (const rawIssue of toTextList(rawIssues)) {
    const lower = rawIssue.toLowerCase();
    for (const issue of issueTaxonomy) {
      if (issue.synonyms.some(synonym => lower.includes(String(synonym).toLowerCase()))) {
        normalized.add(issue.id);
      }
    }
  }
  return Array.from(normalized);
}
//# sourceMappingURL=normalizeIssues.js.map