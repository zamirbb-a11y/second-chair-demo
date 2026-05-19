function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length >= 3);
}

function countMatches(caseTokens, targetText) {
  const target = normalizeText(targetText);
  let count = 0;

  for (const token of caseTokens) {
    if (target.includes(token)) count += 1;
  }

  return count;
}

function precedentText(precedent) {
  return [
    precedent.title,
    precedent.shortName,
    precedent.court,
    ...(precedent.issues || []),
    ...(precedent.statutes || []),
    ...(precedent.factualContext || []),
    precedent.holding,
    precedent.risks,
    precedent.keyQuotes,
    precedent.miniRatio,
  ]
    .filter(Boolean)
    .join("\n");
}

export function retrieveRelevantPrecedents(caseText, precedents = [], limit = 6) {
  const caseTokens = tokenize(caseText);

  if (!caseTokens.length || !precedents.length) {
    return [];
  }

  const scored = precedents.map((precedent) => {
    let score = 0;
    const reasons = [];

    const issueMatches = countMatches(
      caseTokens,
      (precedent.issues || []).join(" ")
    );

    if (issueMatches > 0) {
      score += issueMatches * 5;
      reasons.push(`התאמה לסוגיות/תגיות (${issueMatches})`);
    }

    const statuteMatches = countMatches(
      caseTokens,
      (precedent.statutes || []).join(" ")
    );

    if (statuteMatches > 0) {
      score += statuteMatches * 4;
      reasons.push(`התאמה לחקיקה (${statuteMatches})`);
    }

    const titleMatches = countMatches(
      caseTokens,
      `${precedent.title || ""} ${precedent.shortName || ""}`
    );

    if (titleMatches > 0) {
      score += titleMatches * 3;
      reasons.push(`התאמה לכותרת/שם קצר (${titleMatches})`);
    }

    const holdingMatches = countMatches(caseTokens, precedent.holding);

    if (holdingMatches > 0) {
      score += holdingMatches * 4;
      reasons.push(`התאמה להלכה המרכזית (${holdingMatches})`);
    }

    const miniRatioMatches = countMatches(caseTokens, precedent.miniRatio);

    if (miniRatioMatches > 0) {
      score += miniRatioMatches * 1;
      reasons.push(`התאמה למיני-רציו (${miniRatioMatches})`);
    }

    if (precedent.holding) score += 3;
    if (precedent.risks) score += 2;
    if (precedent.keyQuotes) score += 2;

    return {
      ...precedent,
      retrievalScore: score,
      retrievalReasons: reasons,
    };
  });

  return scored
    .filter((item) => item.retrievalScore > 0)
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);
}

export function formatPrecedentsForPrompt(precedents = []) {
  if (!precedents.length) {
    return "לא אותרו מקורות משפטיים רלוונטיים במאגר הפנימי.";
  }

  return precedents
    .map((p, index) => {
      return `
[מקור ${index + 1}]
שם: ${p.title || p.shortName || "ללא כותרת"}
בית משפט: ${p.court || "לא צוין"}
עוזר ל: ${p.helps || "mixed"}
סיבות שליפה: ${(p.retrievalReasons || []).join("; ") || "לא צוין"}

סוגיות:
${(p.issues || []).join("\n")}

חקיקה:
${(p.statutes || []).join("\n")}

הקשר עובדתי:
${(p.factualContext || []).join("\n")}

הלכה מרכזית:
${p.holding || ""}

סיכוני הבחנה:
${p.risks || ""}

ציטוטים חשובים:
${p.keyQuotes || ""}

מיני רציו:
${p.miniRatio || ""}
`;
    })
    .join("\n---\n");
}
