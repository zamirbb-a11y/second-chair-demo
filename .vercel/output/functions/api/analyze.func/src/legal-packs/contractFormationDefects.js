"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _statutes = _interopRequireDefault(require("../legal-knowledge/statutes"));
var _cases = _interopRequireDefault(require("../legal-knowledge/cases"));
var _packs = _interopRequireDefault(require("../legal-knowledge/packs"));
var _litigationHeuristics = _interopRequireDefault(require("../legal-knowledge/litigationHeuristics"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function hasMatchingTag(item, includeTags = []) {
  return item.tags?.some(tag => includeTags.includes(tag));
}
function hasMatchingHeuristic(item, includeHeuristics = []) {
  return includeHeuristics.includes(item.id);
}
const selectedPackDefinitions = [_packs.default.contractFormationDefects, _packs.default.contractInterpretation, _packs.default.contractBreach, _packs.default.contractRemedies].filter(Boolean);
const combinedPack = {
  id: "contractLitigationCore",
  title: "ליבת ליטיגציה חוזית",
  statutes: selectedPackDefinitions.flatMap(pack => _statutes.default.filter(statute => hasMatchingTag(statute, pack.includeTags))),
  cases: selectedPackDefinitions.flatMap(pack => _cases.default.filter(caseItem => hasMatchingTag(caseItem, pack.includeTags))),
  heuristics: selectedPackDefinitions.flatMap(pack => _litigationHeuristics.default.filter(heuristic => hasMatchingHeuristic(heuristic, pack.includeHeuristics))),
  reasoningRules: selectedPackDefinitions.flatMap(pack => pack.reasoningRules || [])
};
var _default = exports.default = combinedPack;
//# sourceMappingURL=contractFormationDefects.js.map