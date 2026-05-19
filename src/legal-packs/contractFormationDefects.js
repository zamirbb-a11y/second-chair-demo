import statutes from "../legal-knowledge/statutes";
import cases from "../legal-knowledge/cases";
import packs from "../legal-knowledge/packs";
import litigationHeuristics from "../legal-knowledge/litigationHeuristics";

function hasMatchingTag(item, includeTags = []) {
  return item.tags?.some((tag) => includeTags.includes(tag));
}

function hasMatchingHeuristic(item, includeHeuristics = []) {
  return includeHeuristics.includes(item.id);
}

const selectedPackDefinitions = [
  packs.contractFormationDefects,
  packs.contractInterpretation,
  packs.contractBreach,
  packs.contractRemedies,
].filter(Boolean);

const combinedPack = {
  id: "contractLitigationCore",

  title: "ליבת ליטיגציה חוזית",

  statutes: selectedPackDefinitions.flatMap((pack) =>
    statutes.filter((statute) => hasMatchingTag(statute, pack.includeTags))
  ),

  cases: selectedPackDefinitions.flatMap((pack) =>
    cases.filter((caseItem) => hasMatchingTag(caseItem, pack.includeTags))
  ),

  heuristics: selectedPackDefinitions.flatMap((pack) =>
    litigationHeuristics.filter((heuristic) =>
      hasMatchingHeuristic(heuristic, pack.includeHeuristics)
    )
  ),

  reasoningRules: selectedPackDefinitions.flatMap(
    (pack) => pack.reasoningRules || []
  ),
};

export default combinedPack;