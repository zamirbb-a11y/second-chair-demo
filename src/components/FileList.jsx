export default function FileList({
  files,
  status,
}) {
  if (!files.length && !status) {
    return null;
  }

  return (
    <div className="space-y-3">
      {status && (
        <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          {status}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const icon =
              getFileIcon(file.type);

            const statusStyle =
              getStatusStyle(
                file.status
              );

            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3 hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-2xl shrink-0">
                    {icon}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm text-slate-800">
                      {file.name}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      {formatType(
                        file.type
                      )}{" "}
                      ·{" "}
                      {formatFileSize(
                        file.size
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyle}`}
                >
                  {file.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getFileIcon(type) {
  if (!type) return "📄";

  const normalized =
    type.toLowerCase();

  if (normalized === "docx") {
    return "📘";
  }

  if (normalized === "pdf") {
    return "📕";
  }

  if (normalized === "txt") {
    return "📄";
  }

  if (
    normalized === "eml" ||
    normalized === "msg"
  ) {
    return "✉️";
  }

  if (normalized === "zip") {
    return "🗜️";
  }

  if (
    normalized === "png" ||
    normalized === "jpg" ||
    normalized === "jpeg"
  ) {
    return "🖼️";
  }

  return "📁";
}

function getStatusStyle(status) {
  if (!status) {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "נטען") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    status ===
    "הפורמט טרם נתמך"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    status ===
    "שגיאה בקריאת הקובץ"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function formatType(type) {
  if (!type) return "קובץ";

  return type.toUpperCase();
}

function formatFileSize(size) {
  if (!size) return "";

  if (size < 1024 * 1024) {
    return `${Math.round(
      size / 1024
    )} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}
