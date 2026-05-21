import { useState } from "react";
import { normalizeTimelineDate } from "../utils/normalizeTimelineDate";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_NAMES = {
  "01": "ינואר", "02": "פברואר", "03": "מרץ", "04": "אפריל",
  "05": "מאי",   "06": "יוני",   "07": "יולי", "08": "אוגוסט",
  "09": "ספטמבר","10": "אוקטובר","11": "נובמבר","12": "דצמבר",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function resolveOverlayDates(patch) {
  const { sortDate: storedSort, displayDate: storedDisplay } = patch;

  if (storedDisplay && storedSort && ISO_RE.test(storedSort)) {
    return {
      displayDate: storedDisplay,
      sortDate: storedSort,
      isApproximate: patch.isApproximate ?? false,
      datePrecision: patch.datePrecision || "exact",
    };
  }

  const raw = patch.rawDate || patch.date || null;
  const norm = normalizeTimelineDate(raw);
  return {
    displayDate:
      storedDisplay && storedDisplay !== "מועד לא ידוע"
        ? storedDisplay
        : norm.displayDate,
    sortDate: norm.sortDate,
    isApproximate: norm.isApproximate,
    datePrecision: norm.datePrecision,
  };
}

function buildMergedTimeline(baseItems, overlays) {
  const result = (baseItems || []).map((item, index) => {
    const norm = normalizeTimelineDate(item.date);
    return {
      id: `base-timeline-${index}`,
      ...norm,
      event: item.event || "אירוע",
      source: "base",
      isNew: false,
      isEdited: false,
      hidden: false,
      overlayId: null,
    };
  });

  for (const overlay of overlays) {
    const { action } = overlay.patch;

    if (action === "hide_event") {
      const idx = result.findIndex((i) => i.id === overlay.patch.targetId);
      if (idx !== -1) result[idx] = { ...result[idx], hidden: true };

    } else if (action === "edit_event") {
      const idx = result.findIndex((i) => i.id === overlay.patch.targetId);
      if (idx !== -1) {
        const dates = resolveOverlayDates(overlay.patch);
        result[idx] = {
          ...result[idx],
          ...dates,
          event: overlay.patch.event || result[idx].event,
          isEdited: true,
        };
      }

    } else if (action === "add_event" || action === "add_timeline_event") {
      const dates = resolveOverlayDates(overlay.patch);
      result.push({
        id: overlay.id,
        ...dates,
        event: overlay.patch.event || "",
        source: "overlay",
        isNew: overlay.isNew,
        isEdited: false,
        hidden: false,
        overlayId: overlay.id,
      });
    }
  }

  return result
    .filter((i) => !i.hidden)
    .sort((a, b) => {
      if (!a.sortDate && !b.sortDate) return 0;
      if (!a.sortDate) return 1;
      if (!b.sortDate) return -1;
      return a.sortDate.localeCompare(b.sortDate);
    });
}

function getGroupKey(item) {
  if (!item.sortDate) return "unknown";
  if (item.datePrecision === "year") return item.sortDate.slice(0, 4);
  return item.sortDate.slice(0, 7);
}

function groupLabel(key) {
  if (key === "unknown") return "ללא תאריך";
  if (key.length === 4) return key;
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[month] || month} ${year}`;
}

function groupEvents(merged) {
  const map = new Map();
  for (const item of merged) {
    const key = getGroupKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: groupLabel(key),
    items,
  }));
}

// ─── main component ──────────────────────────────────────────────────────────

export default function HorizontalTimeline({
  items,
  overlayItems = [],
  onRollback,
  onAddEvent,
  onEditEvent,
  onHideEvent,
}) {
  const [mode, setMode] = useState("detailed");
  const [editingItem, setEditingItem] = useState(null);

  const merged = buildMergedTimeline(items, overlayItems);

  function handleSave(formData) {
    if (editingItem?._new) {
      onAddEvent?.(formData);
    } else {
      onEditEvent?.(editingItem.id, formData);
    }
    setEditingItem(null);
  }

  function handleHide(item) {
    if (item.source === "overlay") onRollback?.(item.overlayId);
    else onHideEvent?.(item.id);
  }

  return (
    <div className="pb-2">
      {/* toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
          <ModeButton active={mode === "detailed"} onClick={() => setMode("detailed")}>
            ציר מפורט
          </ModeButton>
          <ModeButton active={mode === "grouped"} onClick={() => setMode("grouped")}>
            תצוגה מרוכזת
          </ModeButton>
        </div>

        <button
          type="button"
          onClick={() => setEditingItem({ _new: true })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          + הוסף אירוע
        </button>
      </div>

      {merged.length === 0 ? (
        <p className="text-slate-500 text-sm">לא זוהה לוח זמנים מספק.</p>
      ) : mode === "detailed" ? (
        <DetailedTimeline
          merged={merged}
          onEdit={setEditingItem}
          onHide={handleHide}
        />
      ) : (
        <GroupedTimeline
          merged={merged}
          onEdit={setEditingItem}
          onHide={handleHide}
        />
      )}

      {editingItem && (
        <TimelineEventForm
          item={editingItem._new ? null : editingItem}
          onSave={handleSave}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// ─── detailed view ───────────────────────────────────────────────────────────

function DetailedTimeline({ merged, onEdit, onHide }) {
  return (
    <div className="w-max min-w-full">
      <div className="relative flex items-start gap-16 pt-2">
        <div className="absolute top-5 left-0 right-0 h-px bg-slate-300" />

        {merged.map((item) => (
          <div key={item.id} className="relative z-10 w-52 text-center shrink-0">
            <div
              className={`mx-auto mb-2 h-3.5 w-3.5 rounded-full border-2 ${
                item.source === "overlay"
                  ? "border-blue-500 bg-blue-100"
                  : "border-slate-700 bg-white"
              }`}
            />

            <div className="text-[11px] font-semibold text-slate-500">
              {item.displayDate}
            </div>

            {item.isApproximate && (
              <div className="mt-0.5 text-[9px] text-slate-400">משוער</div>
            )}

            <div className="mt-1 text-sm font-semibold leading-5">{item.event}</div>

            <div className="mt-1.5 flex flex-col items-center gap-1">
              {item.isNew && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  חדש
                </span>
              )}
              {item.isEdited && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  נערך
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="text-[10px] text-slate-400 hover:text-slate-700 transition"
                >
                  ערוך
                </button>
                <button
                  type="button"
                  onClick={() => onHide(item)}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition"
                >
                  הסתר
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── grouped view ────────────────────────────────────────────────────────────

function GroupedTimeline({ merged, onEdit, onHide }) {
  const groups = groupEvents(merged);
  const [expanded, setExpanded] = useState(new Set());

  function toggleExpand(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="w-max min-w-full">
      <div className="relative flex items-start gap-5 pt-2">
        <div className="absolute top-[18px] left-0 right-0 h-px bg-slate-200" />

        {groups.map(({ key, label, items }) => {
          const isExpanded = expanded.has(key);
          const preview = isExpanded ? items : items.slice(0, 3);
          const hiddenCount = items.length - 3;
          const hasOverlays = items.some((i) => i.isNew || i.isEdited);
          const isImportant = items.length >= 4 || hasOverlays;

          return (
            <div key={key} className="relative flex flex-col items-center w-52 shrink-0">
              {/* axis node */}
              <div
                className={`relative z-10 mb-3 h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                  isImportant ? "border-blue-500 bg-blue-100" : "border-slate-400 bg-white"
                }`}
              />

              {/* month card */}
              <div
                className={`w-full rounded-xl border ${
                  isImportant ? "border-blue-200 bg-blue-50/30" : "border-slate-200 bg-white"
                }`}
              >
                {/* clickable header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-black/[0.02] rounded-xl transition"
                >
                  <span className="text-sm font-bold text-slate-900">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-1.5 py-px text-xs text-slate-500">
                      {items.length}
                    </span>
                    <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                <div className="h-px bg-slate-100" />

                {/* events */}
                <div className="p-3 space-y-2.5">
                  {preview.map((item) => (
                    <div key={item.id} className="group/item flex items-start gap-2">
                      <div className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />

                      <div className="min-w-0 flex-1">
                        {item.displayDate && (
                          <div className="text-[11px] font-semibold text-slate-400 leading-4 mb-0.5">
                            {item.displayDate}
                            {item.isApproximate && <span className="mr-1 opacity-70">· משוער</span>}
                          </div>
                        )}
                        <div className={`text-xs text-slate-700 leading-5 ${isExpanded ? "" : "truncate"}`}>
                          {item.event}
                        </div>
                        {(item.isNew || item.isEdited) && (
                          <div className="flex gap-1 mt-1">
                            {item.isNew && (
                              <span className="rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-semibold text-blue-700">חדש</span>
                            )}
                            {item.isEdited && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-semibold text-amber-700">נערך</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={`shrink-0 flex flex-col gap-0.5 transition-opacity ${isExpanded ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"}`}>
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 leading-4"
                        >
                          ערוך
                        </button>
                        <button
                          type="button"
                          onClick={() => onHide(item)}
                          className="text-[10px] text-slate-400 hover:text-red-500 leading-4"
                        >
                          הסתר
                        </button>
                      </div>
                    </div>
                  ))}

                  {!isExpanded && hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(key)}
                      className="text-xs text-slate-400 hover:text-slate-700 transition"
                    >
                      + עוד {hiddenCount} אירועים
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── mode toggle button ───────────────────────────────────────────────────────

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// ─── event form ───────────────────────────────────────────────────────────────

function TimelineEventForm({ item, onSave, onCancel }) {
  const [event, setEvent] = useState(item?.event || "");
  const [displayDate, setDisplayDate] = useState(item?.displayDate || "");
  const [sortDate, setSortDate] = useState(item?.sortDate || "");
  const [isApproximate, setIsApproximate] = useState(item?.isApproximate || false);

  function handleSave() {
    if (!event.trim()) return;
    let finalSortDate = sortDate.trim();
    if (!finalSortDate && displayDate.trim()) {
      const norm = normalizeTimelineDate(displayDate.trim());
      if (norm.sortDate) finalSortDate = norm.sortDate;
    }
    const sortIsValid = ISO_RE.test(finalSortDate);
    onSave({
      event: event.trim(),
      displayDate: displayDate.trim() || event.trim(),
      sortDate: sortIsValid ? finalSortDate : null,
      datePrecision: sortIsValid ? "exact" : "unknown",
      isApproximate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="mb-5 text-lg font-bold text-slate-900">
          {item ? "ערוך אירוע" : "הוסף אירוע לציר הזמן"}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">תיאור האירוע</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm leading-6 min-h-[72px]"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="תאר את האירוע..."
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">תאריך לתצוגה</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={displayDate}
              onChange={(e) => setDisplayDate(e.target.value)}
              placeholder='למשל: "אפריל 2021" או "סוף מרץ 2021"'
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              תאריך למיון{" "}
              <span className="font-normal text-slate-400">(YYYY-MM-DD — אופציונלי)</span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
              value={sortDate}
              onChange={(e) => setSortDate(e.target.value)}
              placeholder="2021-04-15"
              dir="ltr"
            />
            <div className="mt-1 text-[11px] text-slate-400">
              אם ריק — יחושב אוטומטית מתאריך התצוגה
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isApproximate}
              onChange={(e) => setIsApproximate(e.target.checked)}
              className="rounded"
            />
            תאריך משוער
          </label>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!event.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
