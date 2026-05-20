import Card from "./Card";
import FileList from "./FileList";

export default function CaseIntake({
  caseText,
  setCaseText,
  handleWordUpload,
  uploadedFiles,
  status,
  runAnalysis,
  loading,
  hasAnalysis = false,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px] gap-4">
      <Card title={hasAnalysis ? "הוספת מידע לתיק" : "תיאור מקרה"} compact>
        <textarea
          value={caseText}
          onChange={(e) => setCaseText(e.target.value)}
          placeholder="תאר בקצרה את הרקע העובדתי, העסקה, המחלוקת המרכזית, המסמכים החשובים והסעד המבוקש."
          className="w-full min-h-56 rounded-xl border p-4 leading-7 text-sm"
        />

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mt-3 w-full bg-slate-900 text-white rounded-xl px-5 py-3 disabled:opacity-60 font-semibold"
        >
          {loading
            ? hasAnalysis
              ? "מעדכן ניתוח..."
              : "מנתח תיק..."
            : hasAnalysis
              ? "עדכן ניתוח"
              : "נתח תיק"}
        </button>
      </Card>

      <Card title="חומרי תיק" compact>
        <label className="flex min-h-56 items-center justify-center border-2 border-dashed rounded-2xl px-4 py-6 text-center cursor-pointer bg-slate-50 hover:bg-white transition">
          <div>
            <div className="text-3xl mb-2">📁</div>

            <div className="font-semibold">העלה מסמכי תיק</div>

            <div className="text-sm text-slate-500 mt-2 leading-6">
              אפשר לבחור כמה קבצים יחד.
              <br />
              הדמו תומך ב־DOCX, TXT, EML ו־PDF קריא.
              <br />
              PDF סרוק או תמונתי עדיין דורש OCR.
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <FormatBadge label="DOCX פעיל" active />
              <FormatBadge label="PDF פעיל" active />
              <FormatBadge label="TXT פעיל" active />
              <FormatBadge label="EML פעיל" active />
              <FormatBadge label="MSG בהמשך" />
              <FormatBadge label="ZIP בהמשך" />
              <FormatBadge label="OCR בקרוב" />
            </div>
          </div>

          <input
            type="file"
            multiple
            accept=".docx,.pdf,.txt,.eml,.msg,.zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,message/rfc822"
            onChange={handleWordUpload}
            className="hidden"
          />
        </label>

        <div className="mt-3 rounded-2xl border bg-white p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">
            קבצים שנוספו
          </div>

          <FileList files={uploadedFiles} status={status} />
        </div>

        <div className="mt-3 text-xs text-slate-500 leading-5">
          PDF טקסטואלי נתמך כעת.
          <br />
          מסמכי PDF סרוקים או תמונתיים עדיין דורשים OCR.
          <br />
          מגבלת גודל בגרסת הדמו: עד 4MB לקובץ.
        </div>
      </Card>
    </div>
  );
}

function FormatBadge({ label, active }) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1"
          : "rounded-full bg-white border text-slate-500 px-2.5 py-1"
      }
    >
      {label}
    </span>
  );
}