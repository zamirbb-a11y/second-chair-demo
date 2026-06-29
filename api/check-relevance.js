export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { item, issues = [] } = req.body || {};
    if (!item?.title || !issues.length) return res.status(200).json({ relevantIssueIds: [] });

    const issueList = issues
      .map(i => `ID: "${i.id}" — ${i.title}${i.description ? `: ${i.description}` : ""}`)
      .join("\n");

    const prompt = `פריט חדש שעורך הדין הוסיף לתיק:
סוג: ${item.type || "לא ידוע"}
כותרת: ${item.title}
${item.description ? `פירוט: ${item.description}` : ""}

מחלוקות בתיק:
${issueList}

לאיזה מחלוקות הפריט הנ"ל רלוונטי?
רלוונטי = הפריט עשוי להשפיע על הניתוח, הראיות, הסיכויים, הטיעונים או הכיוון המשפטי של אותה מחלוקת.
החזר JSON בלבד: { "relevantIssueIds": ["id1", "id2"] }
אם הפריט לא רלוונטי לשום מחלוקת — החזר מערך ריק.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(200).json({ relevantIssueIds: [] });

    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return res.status(200).json({ relevantIssueIds: parsed.relevantIssueIds ?? [] });
  } catch (err) {
    console.error("check-relevance failed:", err);
    return res.status(200).json({ relevantIssueIds: [] });
  }
}
