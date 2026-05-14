import statutes from "../legal-knowledge/statutes";
import cases from "../legal-knowledge/cases";
import packs from "../legal-knowledge/packs";

function hasMatchingTag(item, includeTags) {
  return item.tags?.some((tag) => includeTags.includes(tag));
}

const packDefinition = packs.contractFormationDefects;

const contractFormationDefectsPack = {
  ...packDefinition,

  statutes: statutes.filter((statute) =>
    hasMatchingTag(statute, packDefinition.includeTags)
  ),

  cases: cases.filter((caseItem) =>
    hasMatchingTag(caseItem, packDefinition.includeTags)
  )
};

export default contractFormationDefectsPack;
