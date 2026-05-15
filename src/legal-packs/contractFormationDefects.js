import statutes from "../legal-knowledge/statutes";
import cases from "../legal-knowledge/cases";
import packs from "../legal-knowledge/packs";
import litigationHeuristics from "../legal-knowledge/litigationHeuristics";

function hasMatchingTag(item, includeTags) {
  return item.tags?.some((tag) => includeTags.includes(tag));
}

function hasMatchingHeuristic(item, includeHeuristics) {
  return includeHeuristics?.includes(item.id);
}

const packDefinition = packs.contractFormationDefects;

const contractFormationDefectsPack = {
  ...packDefinition,

  statutes: statutes.filter((statute) =>
    hasMatchingTag(statute, packDefinition.includeTags)
  ),

  cases: cases.filter((caseItem) =>
    hasMatchingTag(caseItem, packDefinition.includeTags)
  ),

  heuristics: litigationHeuristics.filter((heuristic) =>
    hasMatchingHeuristic(
      heuristic,
      packDefinition.includeHeuristics
    )
  )
};

export default contractFormationDefectsPack;
