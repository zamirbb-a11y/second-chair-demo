import { useMemo, useState } from "react";
import precedentBank from "../legal-knowledge/precedents.json";

function createPrecedentId(precedent = {}) {
  const base =
    precedent.caseNumber ||
    precedent.displayName ||
    precedent.shortName ||
    "precedent";

  return `precedent-${String(base)
    .replace(/\s+/g, "-")
    .replace(/[^\u0590-\u05ffA-Za-z0-9-]/g, "")}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [String(value)];
}

function normalizePrecedent(precedent = {}) {
  const displayName =
    precedent.displayName ||
    precedent.title ||
    `${precedent.caseNumber || ""} ${precedent.partyNames || ""}`.trim();

  return {
    id: precedent.id || createPrecedentId(precedent),
    caseNumber: precedent.caseNumber || "",
    partyNames: precedent.partyNames || "",
    displayName,
    title: precedent.title || displayName,
    shortName: precedent.shortName || "",
    court: precedent.court || "",
    year: precedent.year || "",

    legalWorlds: normalizeArray(precedent.legalWorlds),
    issuePrioritySignals: normalizeArray(precedent.issuePrioritySignals),
    statutes: normalizeArray(precedent.statutes),
    nevoTags: normalizeArray(precedent.nevoTags),
    issues: normalizeArray(precedent.issues),
    normalizedIssues: normalizeArray(precedent.normalizedIssues),

    factualSummary: precedent.factualSummary || "",
    holding: precedent.holding || "",
    miniRatio: precedent.miniRatio || "",

    claimantUse: precedent.claimantUse || "",
    defenseUse: precedent.defenseUse || "",

    factualTriggers: normalizeArray(precedent.factualTriggers),
    evidencePatterns: normalizeArray(precedent.evidencePatterns),

    risks: precedent.risks || "",
    distinguishesFrom: precedent.distinguishesFrom || "",

    helps: precedent.helps || "Mixed",
    extractionStatus: precedent.extractionStatus || "approved",
    extractionConfidence: precedent.extractionConfidence || "",
    extractionWarnings: normalizeArray(precedent.extractionWarnings),
  };
}

function createBlankPrecedent() {
  return normalizePrecedent({
    id: createPrecedentId(),
    extractionStatus: "manual",
    extractionConfidence: "Medium",
  });
}

function textToArray(value) {
  return value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function PrecedentBankManager() {
  const initialItems = (precedentBank || []).map((p) => normalizePrecedent(p));

  const [items, setItems] = useState(initialItems);
  const [drafts, setDrafts] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id || null);
  const [selectedEditDraft, setSelectedEditDraft] = useState(null);
  const [uploading, setUploading] = useState(false);

  const hasIntakeDrafts = drafts.length > 0;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;

    return items.filter((p) =>
      [
        p.displayName,
        p.title,
        p.caseNumber,
        p.partyNames,
        p.shortName,
        p.court,
        p.miniRatio,
        ...(p.issues || []),
        ...(p.statutes || []),
        ...(p.nevoTags || []),
        ...(p.legalWorlds || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  const selected =
    items.find((p) => p.id === selectedId) || filtered[0] || null;

  async function handlePrecedentUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setSelectedEditDraft(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const nextDrafts = [];

      for (const file of data.files || []) {
        if (!file.text?.trim()) {
          nextDrafts.push({
            id: createPrecedentId({ displayName: file.name }),
            fileName: file.name,
            status: file.status || "no-text",
            error: "לא חולץ טקסט",
            precedent: null,
            rawText: file.text || "",
          });
          continue;
        }

        const extractionResponse = await fetch("/api/extract-precedent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            text: file.text,
          }),
        });

        if (!extractionResponse.ok) {
          nextDrafts.push({
            id: createPrecedentId({ displayName: file.name }),
            fileName: file.name,
            status: "extraction-error",
            error: "חילוץ הפסיקה נכשל",
            precedent: null,
            rawText: file.text,
          });
          continue;
        }

        const extractionData = await extractionResponse.json();

        nextDrafts.push({
          id: createPrecedentId(extractionData.precedent),
          fileName: file.name,
          status: "draft",
          error: "",
          precedent: normalizePrecedent({
            ...extractionData.precedent,
            extractionStatus: "draft",
          }),
          rawText: file.text,
        });
      }

      setDrafts((prev) => [...nextDrafts, ...prev]);
    } catch (err) {
      console.error(err);
      alert("שגיאה בהעלאת או חילוץ פסקי הדין");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function updateDraft(draftId, field, value) {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId && draft.precedent
          ? {
              ...draft,
              precedent: {
                ...draft.precedent,
                [field]: value,
              },
            }
          : draft
      )
    );
  }

  function updateDraftArrayField(draftId, field, value) {
    updateDraft(draftId, field, textToArray(value));
  }

  function approveDraft(draftId) {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft?.precedent) return;

    const approved = normalizePrecedent({
      ...draft.precedent,
      id: createPrecedentId(draft.precedent),
      extractionStatus: "approved",
    });

    setItems((prev) => [approved, ...prev]);
    setSelectedId(approved.id);
    setSelectedEditDraft(null);
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }

  function deleteDraft(draftId) {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }

  function handleSelectBankItem(id) {
    setSelectedId(id);
    setSelectedEditDraft(null);
  }

  function startEditingSelected() {
    if (!selected || hasIntakeDrafts) return;
    setSelectedEditDraft(structuredClone(selected));
  }

  function updateSelectedEditDraft(field, value) {
    setSelectedEditDraft((prev) =>
      prev ? { ...prev, [field]: value } : prev
    );
  }

  function updateSelectedEditDraftArrayField(field, value) {
    updateSelectedEditDraft(field, textToArray(value));
  }

  function saveSelectedEditDraft() {
    if (!selectedEditDraft?.id) return;

    const normalized = normalizePrecedent(selectedEditDraft);

    setItems((prev) =>
      prev.map((p) => (p.id === normalized.id ? normalized : p))
    );

    setSelectedId(normalized.id);
    setSelectedEditDraft(null);
  }

  function cancelSelectedEditDraft() {
    setSelectedEditDraft(null);
  }

  function addBlankPrecedent() {
    setSelectedEditDraft(null);

    const next = createBlankPrecedent();
    setItems((prev) => [next, ...prev]);
    setSelectedId(next.id);
  }

  function deleteSelected() {
    if (!selected || hasIntakeDrafts) return;

    setItems((prev) => prev.filter((p) => p.id !== selected.id));
    setSelectedId(null);
    setSelectedEditDraft(null);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "precedents.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ניהול מאגר פסיקה</h1>
          <p className="text-sm text-slate-500">
            {items.length} פסקי דין במאגר · {drafts.length} טיוטות קליטה
          </p>
        </div>

        <div className="flex gap-2">
          <label className="cursor-pointer rounded-xl border bg-white px-4 py-2">
            {uploading ? "מעלה ומחלץ..." : "העלה פסקי דין"}
            <input
              type="file"
              multiple
              hidden
              onChange={handlePrecedentUpload}
            />
          </label>

          <button
            onClick={addBlankPrecedent}
            disabled={hasIntakeDrafts}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            הוסף ידנית
          </button>

          <button
            onClick={exportJson}
            className="rounded-xl border bg-white px-4 py-2"
          >
            יצא JSON
          </button>
        </div>
      </div>

      {hasIntakeDrafts && (
        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-xl font-bold">
            טיוטות קליטה מפסקי דין שהועלו
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            כל עוד קיימות טיוטות קליטה, עריכת פסקי דין קיימים במאגר מושבתת כדי
            לא לערבב בין קליטה חדשה לבין עדכון מאגר קיים.
          </p>

          <div className="space-y-5">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{draft.fileName}</div>
                    <div className="text-xs text-slate-500">{draft.status}</div>
                  </div>

                  <div className="flex gap-2">
                    {draft.precedent && (
                      <button
                        onClick={() => approveDraft(draft.id)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                      >
                        אשר והוסף למאגר
                      </button>
                    )}

                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-red-600"
                    >
                      מחק טיוטה
                    </button>
                  </div>
                </div>

                {draft.error && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {draft.error}
                  </div>
                )}

                {draft.precedent ? (
                  <PrecedentEditor
                    precedent={draft.precedent}
                    updateField={(field, value) =>
                      updateDraft(draft.id, field, value)
                    }
                    updateArrayField={(field, value) =>
                      updateDraftArrayField(draft.id, field, value)
                    }
                  />
                ) : (
                  <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs">
                    {draft.rawText || "אין טקסט להצגה"}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-12 gap-4">
        <aside className="col-span-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">המאגר הקיים</h2>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם, תגית, סעיף, סוגיה..."
            className="mb-4 w-full rounded-xl border px-3 py-2"
          />

          <div className="max-h-[75vh] space-y-2 overflow-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectBankItem(p.id)}
                className={`w-full rounded-xl border p-3 text-right hover:bg-slate-50 ${
                  selected?.id === p.id ? "border-slate-900 bg-slate-50" : ""
                }`}
              >
                <div className="font-semibold">
                  {p.shortName || p.displayName || p.title || "ללא שם"}
                </div>

                <div className="text-xs text-slate-500">
                  {p.court || "ללא ערכאה"} · {p.year || "ללא שנה"}
                </div>

                <div className="mt-1 text-xs text-slate-600">
                  {(p.issues || []).slice(0, 3).join(" · ")}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="col-span-8 rounded-2xl bg-white p-5 shadow-sm">
          {!selected ? (
            <div>לא נבחר פסק דין</div>
          ) : hasIntakeDrafts ? (
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 font-bold text-slate-900">
                {selected.shortName ||
                  selected.displayName ||
                  selected.title ||
                  "פסק דין"}
              </div>
              יש כרגע טיוטות קליטה פתוחות. סיים לאשר או למחוק אותן לפני עריכת
              פסק דין קיים במאגר.
            </div>
          ) : selectedEditDraft ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  עריכת פסק דין קיים במאגר
                </h2>

                <div className="flex gap-2">
                  <button
                    onClick={saveSelectedEditDraft}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                  >
                    שמור שינויים במאגר
                  </button>

                  <button
                    onClick={cancelSelectedEditDraft}
                    className="rounded-xl border bg-white px-4 py-2"
                  >
                    בטל שינויים
                  </button>
                </div>
              </div>

              <PrecedentEditor
                precedent={selectedEditDraft}
                updateField={updateSelectedEditDraft}
                updateArrayField={updateSelectedEditDraftArrayField}
              />
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {selected.shortName ||
                      selected.displayName ||
                      selected.title ||
                      "פסק דין"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    מצב צפייה. לחץ עריכה כדי לשנות שדות קיימים.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={startEditingSelected}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                  >
                    ערוך פסק דין
                  </button>

                  <button
                    onClick={deleteSelected}
                    className="rounded-xl border border-red-200 px-4 py-2 text-red-600"
                  >
                    מחק מהמאגר
                  </button>
                </div>
              </div>

              <PrecedentReadOnly precedent={selected} />
            </>
          )}
        </main>
      </section>
    </div>
  );
}

function PrecedentReadOnly({ precedent }) {
  return (
    <div className="space-y-3 text-sm">
      <ReadOnlyField label="מספר הליך" value={precedent.caseNumber} />
      <ReadOnlyField label="שמות הצדדים" value={precedent.partyNames} />
      <ReadOnlyField label="שם תצוגה" value={precedent.displayName} />
      <ReadOnlyField label="שם קצר" value={precedent.shortName} />
      <ReadOnlyField label="ערכאה" value={precedent.court} />
      <ReadOnlyField label="שנה" value={precedent.year} />
      <ReadOnlyField label="עולמות משפטיים" value={precedent.legalWorlds} />
      <ReadOnlyField label="סוגיות" value={precedent.issues} />
      <ReadOnlyField label="חקיקה" value={precedent.statutes} />
      <ReadOnlyField label="תקציר עובדתי" value={precedent.factualSummary} />
      <ReadOnlyField label="מיני רציו" value={precedent.miniRatio} />
      <ReadOnlyField label="הלכה / קביעה מרכזית" value={precedent.holding} />
      <ReadOnlyField label="שימוש לתובע" value={precedent.claimantUse} />
      <ReadOnlyField label="שימוש להגנה" value={precedent.defenseUse} />
      <ReadOnlyField label="טריגרים עובדתיים" value={precedent.factualTriggers} />
      <ReadOnlyField label="דפוסי ראיות" value={precedent.evidencePatterns} />
      <ReadOnlyField label="סיכוני הבחנה" value={precedent.risks} />
      <ReadOnlyField
        label="מתי לא מתאים / הבחנה"
        value={precedent.distinguishesFrom}
      />
      <ReadOnlyField label="מסייע למי" value={precedent.helps} />
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  const displayValue = Array.isArray(value) ? value.join(" · ") : value;

  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-slate-900">
        {displayValue || "—"}
      </div>
    </div>
  );
}

function PrecedentEditor({ precedent, updateField, updateArrayField }) {
  return (
    <div className="space-y-4">
      <Field
        label="מספר הליך"
        value={precedent.caseNumber}
        onChange={(v) => updateField("caseNumber", v)}
      />

      <Field
        label="שמות הצדדים"
        value={precedent.partyNames}
        onChange={(v) => updateField("partyNames", v)}
      />

      <Field
        label="שם תצוגה"
        value={precedent.displayName || precedent.title}
        onChange={(v) => {
          updateField("displayName", v);
          updateField("title", v);
        }}
      />

      <Field
        label="שם קצר"
        value={precedent.shortName}
        onChange={(v) => updateField("shortName", v)}
      />

      <Field
        label="ערכאה"
        value={precedent.court}
        onChange={(v) => updateField("court", v)}
      />

      <Field
        label="שנה"
        value={precedent.year}
        onChange={(v) => updateField("year", v)}
      />

      <TextArea
        label="עולמות משפטיים"
        value={(precedent.legalWorlds || []).join("\n")}
        onChange={(v) => updateArrayField("legalWorlds", v)}
      />

      <TextArea
        label="סימני חשיבות סוגיה"
        value={(precedent.issuePrioritySignals || []).join("\n")}
        onChange={(v) => updateArrayField("issuePrioritySignals", v)}
      />

      <TextArea
        label="סוגיות"
        value={(precedent.issues || []).join("\n")}
        onChange={(v) => updateArrayField("issues", v)}
      />
<TextArea
  label="סיווגים מנורמלים"
  value={(precedent.normalizedIssues || []).join("\n")}
  onChange={(v) => updateArrayField("normalizedIssues", v)}
/>
      <TextArea
        label="חקיקה"
        value={(precedent.statutes || []).join("\n")}
        onChange={(v) => updateArrayField("statutes", v)}
      />

      <TextArea
        label="תגיות נבו"
        value={(precedent.nevoTags || []).join("\n")}
        onChange={(v) => updateArrayField("nevoTags", v)}
      />

      <TextArea
        label="תקציר עובדתי"
        value={precedent.factualSummary}
        onChange={(v) => updateField("factualSummary", v)}
      />

      <TextArea
        label="מיני רציו"
        value={precedent.miniRatio}
        onChange={(v) => updateField("miniRatio", v)}
      />

      <TextArea
        label="הלכה / קביעה מרכזית"
        value={precedent.holding}
        onChange={(v) => updateField("holding", v)}
      />

      <TextArea
        label="שימוש לתובע"
        value={precedent.claimantUse}
        onChange={(v) => updateField("claimantUse", v)}
      />

      <TextArea
        label="שימוש להגנה"
        value={precedent.defenseUse}
        onChange={(v) => updateField("defenseUse", v)}
      />

      <TextArea
        label="טריגרים עובדתיים"
        value={(precedent.factualTriggers || []).join("\n")}
        onChange={(v) => updateArrayField("factualTriggers", v)}
      />

      <TextArea
        label="דפוסי ראיות"
        value={(precedent.evidencePatterns || []).join("\n")}
        onChange={(v) => updateArrayField("evidencePatterns", v)}
      />

      <TextArea
        label="סיכוני הבחנה"
        value={precedent.risks}
        onChange={(v) => updateField("risks", v)}
      />

      <TextArea
        label="מתי לא מתאים / הבחנה"
        value={precedent.distinguishesFrom}
        onChange={(v) => updateField("distinguishesFrom", v)}
      />

      <Field
        label="מסייע למי? Claimant / Defense / Mixed"
        value={precedent.helps}
        onChange={(v) => updateField("helps", v)}
      />
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-600">{label}</div>
      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-600">{label}</div>
      <textarea
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        rows={4}
        className="w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}