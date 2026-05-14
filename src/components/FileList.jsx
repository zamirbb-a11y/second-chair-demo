export default function FileList({ files, status }) {
  if (!files.length && !status) return null;

  return (
    <div className="mt-3 rounded-xl bg-slate-100 p-2 text-sm">
      {status && (
        <div className="mb-2 text-slate-600 text-xs">
          {status}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-white border px-3 py-1.5"
            >
              <div className="truncate text-sm">
                <span className="ml-2">📄</span>
                <span className="font-medium">{file.name}</span>
              </div>

              <div className="text-[11px] text-slate-500 whitespace-nowrap">
                {formatFileSize(file.size)} · {file.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(size) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
