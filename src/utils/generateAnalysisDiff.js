export default function generateAnalysisDiff(
  previousAnalysis,
  newAnalysis
) {
  if (!previousAnalysis || !newAnalysis) {
    return [];
  }

  const changes = [];

  const prevIssues =
    previousAnalysis?.executiveView?.criticalIssues || [];

  const newIssues =
    newAnalysis?.executiveView?.criticalIssues || [];

  prevIssues.forEach((prevIssue) => {
    const matchingIssue = newIssues.find(
      (issue) => issue.title === prevIssue.title
    );

    if (!matchingIssue) return;

    if (prevIssue.analysis !== matchingIssue.analysis) {
      changes.push({
        type: "issue-shift",

        title: `${prevIssue.title} השתנתה`,

        description: buildIssueShiftDescription(
          prevIssue.analysis,
          matchingIssue.analysis
        ),
      });
    }
  });

  const prevBattle =
    previousAnalysis?.caseTheory?.litigationBattleground
      ?.issue || "";

  const newBattle =
    newAnalysis?.caseTheory?.litigationBattleground
      ?.issue || "";

  if (prevBattle && newBattle && prevBattle !== newBattle) {
    changes.push({
      type: "battlefield-shift",

      title: "מוקד המחלוקת השתנה",

      description: `המחלוקת המרכזית עברה מ־"${prevBattle}" ל־"${newBattle}".`,
    });
  }

  return changes.slice(0, 5);
}

function buildIssueShiftDescription(previousText, newText) {
  if (
    newText.includes("גילוי") ||
    newText.includes("וואטסאפ") ||
    newText.includes("יידוע")
  ) {
    return "נוסף מידע שעשוי להעיד על גילוי או יידוע בזמן אמת.";
  }

  if (
    newText.includes("הסתמכות") &&
    !previousText.includes("הסתמכות")
  ) {
    return "מוקד הניתוח עבר לשאלת הסתמכות הרוכשים.";
  }

  if (
    newText.includes("שיהוי") &&
    !previousText.includes("שיהוי")
  ) {
    return "נוספה התייחסות למשמעות השיהוי לאחר גילוי המידע.";
  }

  return "הערכת הסוגיה השתנתה בעקבות מידע חדש.";
}
