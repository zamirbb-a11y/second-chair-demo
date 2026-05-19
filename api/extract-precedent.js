const { normalizeIssues } = require("./lib/normalizeIssues");
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text = "", fileName = "" } = req.body || {};

    if (!text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const sourceText = text.slice(0, 12000);

    const prompt = `
אתה מחלץ מטא-דאטה משפטי מפסק דין ישראלי, בדרך כלל בפורמט נבו.

המטרה:
להפוך פסק דין לטבלת ידע structured עבור מערכת Legal AI.

חשוב:
- אל תמציא מידע שלא מופיע בטקסט.
- אם שדה לא ידוע, החזר מחרוזת ריקה או מערך ריק.
- השתמש בתגיות נבו, חקיקה שאוזכרה ומיני-רציו אם הם מופיעים.
- החזר JSON בלבד, בלי Markdown.

החזר בדיוק את המבנה הבא:

{
  "caseNumber": "",
  "partyNames": "",
  "displayName": "",
  "shortName": "",
  "court": "",
  "year": "",
  "legalWorlds": [],
  "issuePrioritySignals": [],
  "statutes": [],
  "nevoTags": [],
  "issues": [],
  "factualSummary": "",
  "holding": "",
  "miniRatio": "",
  "claimantUse": "",
  "defenseUse": "",
  "factualTriggers": [],
  "evidencePatterns": [],
  "risks": "",
  "distinguishesFrom": "",
  "helps": "Claimant/Defense/Mixed",
  "extractionConfidence": "High/Medium/Low",
  "extractionWarnings": []
}

הנחיות לשדות:
- caseNumber: מספר ההליך בלבד, למשל "ע\"א 2469/06".
- partyNames: שמות הצדדים בלבד, בלי מספר ההליך.
- displayName: caseNumber + partyNames.
- shortName: שם קצר מקובל, למשל "סויסה" או "מבני גזית".
- legalWorlds: עולמות משפטיים כגון contract_formation, no_contract, formation_defect, breach, interpretation, good_faith, disclosure, mistake, misrepresentation, duress, unconscionability, remedies, rescission, restitution, reliance, waiver, estoppel, causation, frustration.
- issuePrioritySignals: למשל goes_to_existence_of_contract, goes_to_validity, goes_to_breach, goes_to_remedy_only.
- statutes: סעיפי חוק שאוזכרו.
- nevoTags: תגיות נבו, למשל "חוזים – הטעיה – אי-גילוי".
- issues: סוגיות משפטיות עיקריות.
- factualSummary: עד 5 משפטים על העובדות.
- holding: ההלכה או הקביעה המרכזית.
- miniRatio: המיני-רציו של נבו, אם קיים; אחרת תקציר קצר.
- claimantUse: איך תובע יכול להשתמש בפסק הדין.
- defenseUse: איך נתבע יכול להשתמש בפסק הדין.
- factualTriggers: עובדות שמפעילות את הרלוונטיות של פסק הדין.
- evidencePatterns: דפוסי ראיות חשובים, למשל מסמך בזמן אמת, שתיקה, ידיעה מוקדמת, no-reliance, as-is.
- risks: סיכוני הבחנה.
- distinguishesFrom: מתי פסק הדין לא מתאים.
- helps: Claimant / Defense / Mixed.

שם הקובץ:
${fileName}

טקסט פסק הדין:
${sourceText}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "אתה מומחה לחילוץ מידע מובנה מפסקי דין ישראליים. החזר JSON תקין בלבד.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI extraction failed:", data);
      return res.status(500).json({
        error: "OpenAI extraction failed",
        details: data,
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No extraction content returned" });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON from model",
        raw: content,
      });
    }

    const precedent = normalizePrecedent(parsed, fileName);
const normalizedPrecedent = {
  ...precedent,
  normalizedIssues: normalizeIssues([
    ...(precedent.issues || []),
    ...(precedent.legalWorlds || []),
    ...(precedent.nevoTags || []),
    precedent.miniRatio || "",
    precedent.holding || "",
  ]),
};
   return res.status(200).json({
  precedent: normalizedPrecedent,
});
  } catch (err) {
    console.error("Precedent extraction failed:", err);

    return res.status(500).json({
      error: "Precedent extraction failed",
      details: err.message,
    });
  }
}

function normalizePrecedent(raw, fileName) {
  const caseNumber = raw.caseNumber || "";
  const partyNames = raw.partyNames || "";
  const displayName =
    raw.displayName || `${caseNumber} ${partyNames}`.trim() || fileName || "";

  return {
    id: createPrecedentId(displayName || fileName),
    caseNumber,
    partyNames,
    displayName,
    title: displayName,
    shortName: raw.shortName || "",
    court: raw.court || "",
    year: raw.year || "",

    legalWorlds: asArray(raw.legalWorlds),
    issuePrioritySignals: asArray(raw.issuePrioritySignals),
    statutes: asArray(raw.statutes),
    nevoTags: asArray(raw.nevoTags),
    issues: asArray(raw.issues),

    factualSummary: raw.factualSummary || "",
    holding: raw.holding || "",
    miniRatio: raw.miniRatio || "",

    claimantUse: raw.claimantUse || "",
    defenseUse: raw.defenseUse || "",

    factualTriggers: asArray(raw.factualTriggers),
    evidencePatterns: asArray(raw.evidencePatterns),

    risks: raw.risks || "",
    distinguishesFrom: raw.distinguishesFrom || "",
    helps: normalizeHelps(raw.helps),

    sourceFileName: fileName || "",
    extractionStatus: "extracted",
    extractionConfidence: raw.extractionConfidence || "Medium",
    extractionWarnings: asArray(raw.extractionWarnings),
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [String(value)];
}

function normalizeHelps(value) {
  if (value === "Claimant" || value === "Defense" || value === "Mixed") {
    return value;
  }

  return "Mixed";
}

function createPrecedentId(value = "") {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9א-ת]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return `precedent_${base}_${Math.random().toString(36).slice(2, 8)}`;
}