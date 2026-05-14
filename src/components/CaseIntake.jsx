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
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="תיאור מקרה" compact>
        <textarea
          value={caseText}
          onChange={(e) => setCaseText(e.target.value)}
          placeholder="תאר בקצרה את הרקע העובדתי, העסקה, המחלוקת המרכזית והסעד המבוקש."
          className="w-full min-h-48 rounded-xl border p-4 leading-7 text-sm"
        />

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="mt-3 w-full bg-slate-900 text-white rounded-xl px-5 py-3 disabled:opacity-60 font-semibold"
        >
          {loading ? "מנתח תיק..." : "נתח תיק"}
        </button>
      </Card>

      <Card title="חומרי תיק" compact>
        <label className="flex min-h-48 items-center justify-center border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer bg-white hover:bg-slate-50">
          <div>
            <div className="text-3xl mb-2">📄</div>
            <div className="font-semibold">העלה קובצי Word</div>
            <div className="text-sm text-slate-500 mt-1">
              כרגע הדמו תומך בקובצי .docx
            </div>
          </div>

          <input
            type="file"
            multiple
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleWordUpload}
            className="hidden"
          />
        </label>

        <FileList files={uploadedFiles} status={status} />
      </Card>
    </div>
  );
}
