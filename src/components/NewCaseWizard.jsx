import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadFilesViaStorage } from "../utils/uploadViaStorage";

const STEPS = [
  { label: "שם התיק",     sub: "זהות התיק" },
  { label: "חומר ראשוני", sub: "עובדות ומסמכים" },
  { label: "הצדדים",      sub: "זיהוי הלקוח" },
];

const ACTION_CFG = {
  answer:          { label: "ענה",       bg: "bg-blue-50",    text: "text-blue-600"   },
  upload_document: { label: "העלה מסמך", bg: "bg-emerald-50", text: "text-emerald-600" },
  ask_client:      { label: "שאל לקוח",  bg: "bg-amber-50",   text: "text-amber-700"  },
};

export default function NewCaseWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(0);

  // Step 1
  const [caseName, setCaseName] = useState("");

  // Step 2
  const [caseText, setCaseText]         = useState("");
  const [processedFiles, setProcessedFiles] = useState([]);
  const [uploadedNames, setUploadedNames]   = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState("");
  const [dragOver, setDragOver]             = useState(false);

  // Step 3 — populated after pre-intake
  const [detectedParties, setDetectedParties] = useState([]);
  const [questions, setQuestions]             = useState([]);
  const [selectedPartyIdx, setSelectedPartyIdx] = useState(null);
  const [customName, setCustomName]             = useState("");
  const [answers, setAnswers]                   = useState({});
  const [dismissed, setDismissed]               = useState(new Set());
  const [loadingPreIntake, setLoadingPreIntake] = useState(false);

  const resolvedClientName =
    selectedPartyIdx !== null && detectedParties[selectedPartyIdx]
      ? detectedParties[selectedPartyIdx]
      : customName;

  // ── File upload ──────────────────────────────────────────────
  async function uploadFiles(fileList) {
    const files = Array.from(fileList).filter(Boolean);
    if (!files.length) return;
    setUploadError("");
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const pf = await uploadFilesViaStorage(files, session?.access_token);
      const processed = Array.isArray(pf) ? pf.filter(Boolean) : [pf].filter(Boolean);
      setProcessedFiles(prev => [...prev, ...processed]);
      setUploadedNames(prev => [...prev, ...processed.map(f => f.name)]);
    } catch (err) {
      setUploadError(err.message || "לא הצלחנו להעלות את הקובץ — נסה שוב.");
    }
    setUploading(false);
  }

  // ── Advance step 2 → 3 (pre-intake in background) ────────────
  async function advanceFromStep2() {
    setLoadingPreIntake(true);
    try {
      const res = await fetch("/api/pre-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseText, files: processedFiles }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetectedParties(data.detectedParties ?? []);
        setQuestions(data.intakeQuestions ?? []);
      }
    } catch {}
    setLoadingPreIntake(false);
    setStep(2);
  }

  // ── Complete ─────────────────────────────────────────────────
  function handleComplete() {
    const finalAnswers = questions
      .map((q, i) => ({ question: q.question, text: answers[i] ?? "" }))
      .filter((_, i) => !dismissed.has(i) && (answers[i] ?? "").trim());
    onComplete({
      caseName: caseName.trim() || "תיק ללא שם",
      caseText,
      processedFiles,
      clientName: resolvedClientName,
      clientRole: undefined,
      answers: finalAnswers,
    });
  }

  const canAdvance = step === 0 ? caseName.trim().length > 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex overflow-hidden"
        style={{ height: "76vh" }}
        dir="rtl"
      >

        {/* ── Sidebar (right in RTL) ───────────────────────────── */}
        <aside className="w-52 bg-slate-900 flex flex-col shrink-0 py-8 px-6">
          {/* Branding */}
          <div className="mb-10">
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.18em] mb-1.5">Second Chair</p>
            <p className="text-white font-bold text-[15px] leading-tight">פתיחת<br/>תיק חדש</p>
          </div>

          {/* Step list */}
          <div className="flex flex-col gap-1 relative">
            {/* Connector line */}
            <div className="absolute right-[22px] top-8 bottom-8 w-px bg-slate-700" />

            {STEPS.map((s, i) => {
              const done   = step > i;
              const active = step === i;
              return (
                <div
                  key={i}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${active ? "bg-white/10" : ""}`}
                >
                  {/* Circle */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 transition-all ring-2 ${
                    done   ? "bg-emerald-400 text-white ring-emerald-400/30" :
                    active ? "bg-white text-slate-900 ring-white/20" :
                             "bg-slate-800 text-slate-400 ring-slate-800"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div>
                    <p className={`text-[12px] font-semibold leading-tight transition-colors ${
                      active ? "text-white" : done ? "text-slate-300" : "text-slate-500"
                    }`}>{s.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer tagline */}
          <div className="mt-auto">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              המידע שתספק משפר את<br/>איכות הניתוח הראשוני.
            </p>
          </div>
        </aside>

        {/* ── Content area (left in RTL) ───────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Step body */}
          <div className="flex-1 overflow-y-auto px-10 py-9">

            {/* ── Step 1: Case name ── */}
            {step === 0 && (
              <div className="flex flex-col gap-7 h-full">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">שלב 1 מתוך 3</p>
                  <h2 className="text-[24px] font-bold text-slate-900 leading-tight">שם התיק</h2>
                  <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
                    בחר שם שיזהה את התיק בקלות — לרוב שמות הצדדים.
                  </p>
                </div>
                <input
                  autoFocus
                  value={caseName}
                  onChange={e => setCaseName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && caseName.trim() && setStep(1)}
                  placeholder="לדוגמה: אלפא טכנולוגיות נ׳ יואב כהן"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 text-[15px] text-slate-900 px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                />
              </div>
            )}

            {/* ── Step 2: Case material ── */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">שלב 2 מתוך 3</p>
                  <h2 className="text-[24px] font-bold text-slate-900 leading-tight">חומר ראשוני</h2>
                  <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
                    תאר את המחלוקת, העלה מסמכים, או שניהם.
                  </p>
                </div>

                <textarea
                  autoFocus
                  value={caseText}
                  onChange={e => setCaseText(e.target.value)}
                  placeholder="תיאור קצר של המחלוקת, העובדות הרלוונטיות, ותפקיד הלקוח…"
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 px-5 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300 leading-relaxed"
                />

                {/* File upload zone */}
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-6 cursor-pointer transition-all ${
                    dragOver   ? "border-indigo-400 bg-indigo-50 scale-[1.01]" :
                    uploading  ? "border-indigo-300 bg-indigo-50/50" :
                                 "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80"
                  }`}
                >
                  <span className="text-xl opacity-60">{uploading ? "⏳" : "📎"}</span>
                  <span className="text-[12px] font-medium text-slate-500">
                    {uploading ? "מעלה קבצים…" : "גרור קבצים לכאן, או לחץ להעלאה"}
                  </span>
                  <span className="text-[10px] text-slate-400">DOCX · PDF · TXT</span>
                  {uploadedNames.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                      {uploadedNames.map((n, i) => (
                        <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 font-medium">{n}</span>
                      ))}
                    </div>
                  )}
                  <input type="file" accept=".docx,.txt,.pdf" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} disabled={uploading} />
                </label>

                {uploadError && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 -mt-2">
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {/* ── Step 3: Parties + questions ── */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">שלב 3 מתוך 3</p>
                  <h2 className="text-[24px] font-bold text-slate-900 leading-tight">הצדדים</h2>
                  <p className="text-[13px] text-slate-400 mt-2">מי הלקוח שאנו מייצגים?</p>
                </div>

                {/* Party buttons or text input */}
                {detectedParties.length >= 2 ? (
                  <div className="flex gap-3">
                    {detectedParties.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedPartyIdx(i); setCustomName(""); }}
                        className={`flex-1 rounded-2xl border-2 text-[13px] font-semibold py-3.5 px-4 transition-all text-right ${
                          selectedPartyIdx === i
                            ? "border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    autoFocus
                    value={customName}
                    onChange={e => { setCustomName(e.target.value); setSelectedPartyIdx(null); }}
                    placeholder="שם הלקוח / הצד שאנו מייצגים"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                  />
                )}

                {/* Pre-intake questions */}
                {questions.length > 0 && (
                  <>
                    <hr className="border-slate-100" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mb-2">פרטים משלימים</p>
                    {questions.map((q, i) => {
                      if (dismissed.has(i)) return null;
                      const cfg = ACTION_CFG[q.suggestedAction] ?? ACTION_CFG.answer;
                      return (
                        <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-2.5">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-[13px] font-semibold text-slate-800 leading-snug">{q.question}</p>
                            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="הקלד תשובה…"
                            value={answers[i] ?? ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-slate-300"
                          />
                          <button
                            className="text-[11px] text-slate-400 hover:text-slate-600 self-start"
                            onClick={() => setDismissed(p => new Set([...p, i]))}
                          >דלג ›</button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Navigation footer ───────────────────────────────── */}
          <div className="border-t border-slate-100 px-10 py-5 flex items-center justify-between shrink-0">
            {step === 0 ? (
              <div className="flex items-center gap-5">
                <button
                  onClick={() => { window.location.href = '/landing.html'; }}
                  className="text-[13px] text-slate-400 hover:text-slate-700 transition-colors"
                >
                  ← דף הבית
                </button>
                <button
                  onClick={() => { window.location.href = '/?action=open'; }}
                  className="text-[13px] text-slate-400 hover:text-slate-700 transition-colors"
                >
                  תיקים קיימים
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-[13px] text-slate-400 hover:text-slate-700 transition-colors"
              >
                ‹ חזור
              </button>
            )}

            <button
              disabled={!canAdvance || loadingPreIntake || uploading}
              onClick={
                step === 0 ? () => setStep(1) :
                step === 1 ? advanceFromStep2 :
                handleComplete
              }
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-[14px] px-8 py-2.5 transition-colors flex items-center gap-2"
            >
              {loadingPreIntake ? (
                <><span className="animate-spin inline-block">⏳</span> מעבד…</>
              ) : step === 2 ? "הרץ ניתוח ›" : "הבא ›"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
