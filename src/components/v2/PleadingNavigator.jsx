import { useState, useRef } from "react";

const SIDE_BADGE = {
  opposing: { label: "שכנגד", bg: "bg-red-50",    text: "text-red-600",     border: "border-red-100"     },
  ours:     { label: "שלנו",  bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
};

const IMPORTANCE_DOT = { central: "bg-blue-500", secondary: "bg-slate-400", peripheral: "bg-slate-300" };
const STRENGTH_DOT   = { strong: "bg-emerald-500", medium: "bg-amber-400", weak: "bg-red-400" };

// ─── Claim rows ────────────────────────────────────────────────────────────────

function ClaimRow({ claim, isSelected, onSelect, subClaims, selectedClaimId }) {
  const isChildSelected = subClaims.some(s => s.id === selectedClaimId);
  return (
    <div>
      <div
        className={["px-4 py-2 cursor-pointer border-r-[3px] transition-all",
          isSelected ? "bg-blue-50 border-blue-500" : "border-transparent hover:bg-slate-50 hover:shadow-sm"].join(" ")}
        onClick={() => onSelect(claim.id)}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${claim.status === "pending" ? "bg-slate-300 animate-pulse" : IMPORTANCE_DOT[claim.importance] ?? "bg-slate-300"}`} />
          <span className={`text-[12px] flex-1 leading-snug ${isSelected ? "text-blue-700 font-semibold" : claim.status === "pending" ? "text-slate-400 italic" : "text-slate-700"}`}>
            {claim.title}
          </span>
          {claim.status !== "pending" && <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${STRENGTH_DOT[claim.strength] ?? "bg-slate-300"}`} />}
        </div>
      </div>
      {subClaims.length > 0 && (isSelected || isChildSelected) && (
        <div className="mr-6 border-r border-slate-200">
          {subClaims.map(sub => (
            <div
              key={sub.id}
              className={["px-3 py-1.5 cursor-pointer border-r-[3px] transition-all",
                selectedClaimId === sub.id ? "bg-blue-50 border-blue-500" : "border-transparent hover:bg-slate-50 hover:shadow-sm"].join(" ")}
              onClick={() => onSelect(sub.id)}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${IMPORTANCE_DOT[sub.importance] ?? "bg-slate-300"}`} />
                <span className={`text-[11px] flex-1 leading-snug ${selectedClaimId === sub.id ? "text-blue-700 font-semibold" : "text-slate-500"}`}>
                  {sub.title}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STRENGTH_DOT[sub.strength] ?? "bg-slate-300"}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pleading row with edit / remove ─────────────────────────────────────────

function PleadingRow({
  pleading, bundleId, isSelected, selectedClaimId,
  onSelectPleading, onSelectClaim,
  onRename, onRemove,
  onDragStart, onDragOver, onDrop, onDragEnd,
  isDragging, isDropTarget,
}) {
  const [editing, setEditing]     = useState(false);
  const [editValue, setEditValue] = useState(pleading.docType);
  const [hovered, setHovered]     = useState(false);
  const inputRef                  = useRef(null);

  const badge     = SIDE_BADGE[pleading.side] ?? SIDE_BADGE.opposing;
  const isPending = pleading.status === "pending";
  const hasSelectedClaim = pleading.claims.some(c =>
    c.id === selectedClaimId || pleading.claims.some(sub => sub.parentId === c.id && sub.id === selectedClaimId)
  );
  const showClaims = (isSelected || hasSelectedClaim) && !isPending && pleading.claims.length > 0;
  const mainClaims = pleading.claims.filter(c => c.type === "main" || !c.parentId);

  function commitRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== pleading.docType) onRename(trimmed);
    else setEditValue(pleading.docType);
    setEditing(false);
  }

  return (
    <div>
      {isDropTarget && <div className="h-0.5 bg-blue-400 mx-3 rounded-full" />}

      <div
        draggable={!editing}
        onDragStart={(e) => { if (editing) return; e.stopPropagation(); onDragStart(bundleId, pleading.id); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(bundleId, pleading.id); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(bundleId, pleading.id); }}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "group flex items-center gap-2 pl-2 pr-3 py-2 border-r-[3px] transition-all",
          isDragging ? "opacity-40" : "",
          isSelected && !selectedClaimId
            ? "bg-blue-50 border-blue-500"
            : hasSelectedClaim ? "bg-slate-50 border-transparent"
            : "border-transparent hover:bg-slate-50 hover:shadow-sm",
        ].join(" ")}
      >
        {/* Drag handle */}
        <span
          className="text-[11px] text-slate-300 cursor-grab select-none flex-shrink-0"
          onMouseDown={e => e.stopPropagation()}
        >⠿</span>

        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPending ? "bg-slate-300" : "bg-emerald-400"}`} />

        {/* Doc name — normal or edit mode */}
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            dir="rtl"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditValue(pleading.docType); setEditing(false); }
            }}
            className="flex-1 text-[12px] bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-200 min-w-0"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className={[
              "text-[12.5px] flex-1 leading-snug cursor-pointer",
              isPending ? "text-slate-400" : isSelected && !selectedClaimId ? "text-blue-700 font-semibold" : "text-slate-700 font-medium",
            ].join(" ")}
            onClick={() => !isPending && onSelectPleading(pleading.id)}
          >
            {pleading.docType}
          </span>
        )}

        {/* Side badge */}
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
          {badge.label}
        </span>

        {/* Edit / Remove — appear on hover */}
        {!editing && hovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              title="שנה שם"
              onClick={e => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors bg-transparent border-0 cursor-pointer text-[11px]"
            >✎</button>
            <button
              title="הסר"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors bg-transparent border-0 cursor-pointer text-[12px] leading-none"
            >×</button>
          </div>
        )}
      </div>

      {showClaims && (
        <div className="pb-1 mr-8 border-r border-slate-200">
          {mainClaims.map(claim => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              isSelected={selectedClaimId === claim.id}
              selectedClaimId={selectedClaimId}
              onSelect={(claimId) => onSelectClaim(bundleId, pleading.id, claimId)}
              subClaims={pleading.claims.filter(c => c.parentId === claim.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bundle section ────────────────────────────────────────────────────────────

function BundleSection({
  bundle, selectedBundleId, selectedPleadingId, selectedClaimId,
  onSelectBundle, onSelectPleading, onSelectClaim,
  onRenamePleading, onRemovePleading,
  onRenameBundle, onRemoveBundle,
  dragState, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd,
  onBundleDragStart, onBundleDragOver, onBundleDrop, onBundleDragEnd,
  isDraggingBundle, isBundleDropTarget,
}) {
  const [hovered, setHovered]     = useState(false);
  const [editing, setEditing]     = useState(false);
  const [editValue, setEditValue] = useState(bundle.label);
  const inputRef                  = useRef(null);

  const uploadedCount    = bundle.pleadings.filter(p => p.status === "analyzed").length;
  const isBundleSelected = selectedBundleId === bundle.id && !selectedPleadingId;
  const isEndDropTarget  = dropTarget?.bundleId === bundle.id && dropTarget?.beforeId === "__end__";

  function commitRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== bundle.label) onRenameBundle(trimmed);
    else setEditValue(bundle.label);
    setEditing(false);
  }

  return (
    <div className={isDraggingBundle ? "opacity-40" : ""}>
      {isBundleDropTarget && <div className="h-0.5 bg-blue-400 mx-3 rounded-full" />}

      <div
        draggable={!editing}
        onDragStart={(e) => { if (editing) return; e.stopPropagation(); onBundleDragStart(bundle.id); }}
        onDragOver={(e) => {
          if (dragState === null) { e.preventDefault(); e.stopPropagation(); onBundleDragOver(bundle.id); }
          else { e.preventDefault(); onDragOver(bundle.id, "__end__"); }
        }}
        onDrop={(e) => {
          e.preventDefault(); e.stopPropagation();
          if (dragState === null) onBundleDrop(bundle.id);
          else onDrop(bundle.id, "__end__");
        }}
        onDragEnd={onBundleDragEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={["flex items-center gap-2 px-4 py-2.5 border-r-[3px] transition-all select-none",
          !editing ? "cursor-pointer" : "",
          isBundleSelected ? "bg-slate-100 border-slate-500" : "border-transparent hover:bg-slate-50 hover:shadow-sm"].join(" ")}
        onClick={() => !editing && onSelectBundle(bundle.id)}
      >
        <span className="text-[11px] text-slate-300 cursor-grab flex-shrink-0" title="גרור להזזת האגד">⠿</span>

        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            dir="rtl"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditValue(bundle.label); setEditing(false); }
            }}
            className="flex-1 text-[12px] font-bold bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-200 min-w-0"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`text-[11.5px] font-bold flex-1 ${isBundleSelected ? "text-slate-800" : "text-slate-700"}`}>
            {bundle.label}
          </span>
        )}

        {!editing && (
          <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">
            {uploadedCount}/{bundle.pleadings.length}
          </span>
        )}

        {!editing && hovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              title="שנה שם"
              onClick={e => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors bg-transparent border-0 cursor-pointer text-[11px]"
            >✎</button>
            <button
              title="הסר אגד"
              onClick={e => { e.stopPropagation(); onRemoveBundle(); }}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors bg-transparent border-0 cursor-pointer text-[12px] leading-none"
            >×</button>
          </div>
        )}
      </div>

      <div>
        {bundle.pleadings.map(pleading => (
          <PleadingRow
            key={pleading.id}
            pleading={pleading}
            bundleId={bundle.id}
            isSelected={selectedPleadingId === pleading.id}
            selectedClaimId={selectedClaimId}
            onSelectPleading={(pid) => onSelectPleading(bundle.id, pid)}
            onSelectClaim={onSelectClaim}
            onRename={(newDocType) => onRenamePleading(bundle.id, pleading.id, newDocType)}
            onRemove={() => onRemovePleading(bundle.id, pleading.id)}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            isDragging={dragState?.pleadingId === pleading.id}
            isDropTarget={dropTarget?.bundleId === bundle.id && dropTarget?.beforeId === pleading.id}
          />
        ))}

        {isEndDropTarget && <div className="h-0.5 bg-blue-400 mx-3 rounded-full" />}

        {bundle.pleadings.length === 0 && (
          <div
            className="mx-3 my-1.5 h-8 rounded-lg border border-dashed border-slate-200 flex items-center justify-center"
            onDragOver={(e) => { e.preventDefault(); onDragOver(bundle.id, "__end__"); }}
            onDrop={(e) => { e.preventDefault(); onDrop(bundle.id, "__end__"); }}
          >
            <span className="text-[11px] text-slate-300">גרור לכאן</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New bundle inline form ────────────────────────────────────────────────────

function NewBundleForm({ onConfirm, onCancel }) {
  const [label, setLabel] = useState("");
  return (
    <div className="px-3 pt-2 pb-1 space-y-1.5">
      <input
        autoFocus
        dir="rtl"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && label.trim()) onConfirm(label.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="שם האגד…"
        className="w-full text-[12px] text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
      />
      <div className="flex gap-1.5">
        <button
          disabled={!label.trim()}
          onClick={() => label.trim() && onConfirm(label.trim())}
          className="flex-1 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-30 cursor-pointer border-0 hover:bg-slate-700 transition-colors"
        >צור אגד</button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[11px] text-slate-500 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
        >ביטול</button>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function PleadingNavigator({
  bundles = [],
  selectedBundleId,
  selectedPleadingId,
  selectedClaimId,
  onSelectBundle,
  onSelectPleading,
  onSelectClaim,
  onUpdateBundles,
}) {
  const [dragState, setDragState]           = useState(null); // pleading drag
  const [dropTarget, setDropTarget]         = useState(null);
  const [draggedBundleId, setDraggedBundleId] = useState(null); // bundle drag
  const [bundleDropTarget, setBundleDropTarget] = useState(null); // bundleId to insert before
  const [addingBundle, setAddingBundle]     = useState(false);
  const [width, setWidth]                   = useState(320);

  // ── Drag-to-resize ──────────────────────────────────────────────────────────
  function handleResizeMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;

    function onMove(e) {
      // Handle is on left edge; dragging left = wider (RTL layout)
      const delta = startX - e.clientX;
      setWidth(Math.max(220, Math.min(560, startW + delta)));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Drag-and-drop pleadings ─────────────────────────────────────────────────
  function handleDragStart(bundleId, pleadingId) { setDragState({ bundleId, pleadingId }); }
  function handleDragOver(bundleId, beforeId) { setDropTarget({ bundleId, beforeId }); }

  function handleDrop(targetBundleId, beforeId) {
    if (!dragState || !onUpdateBundles) { setDragState(null); setDropTarget(null); return; }
    const { bundleId: srcBundleId, pleadingId } = dragState;
    const newBundles = bundles.map(b => ({ ...b, pleadings: [...b.pleadings] }));
    const srcBundle = newBundles.find(b => b.id === srcBundleId);
    const srcIdx = srcBundle.pleadings.findIndex(p => p.id === pleadingId);
    if (srcIdx === -1) { setDragState(null); setDropTarget(null); return; }
    const [moved] = srcBundle.pleadings.splice(srcIdx, 1);
    const updated = { ...moved, bundleId: targetBundleId };
    const tgtBundle = newBundles.find(b => b.id === targetBundleId);
    if (beforeId === "__end__" || !beforeId) {
      tgtBundle.pleadings.push(updated);
    } else {
      const tgtIdx = tgtBundle.pleadings.findIndex(p => p.id === beforeId);
      tgtBundle.pleadings.splice(tgtIdx === -1 ? tgtBundle.pleadings.length : tgtIdx, 0, updated);
    }
    onUpdateBundles(newBundles);
    setDragState(null);
    setDropTarget(null);
  }

  function handleDragEnd() { setDragState(null); setDropTarget(null); }

  // ── Bundle drag-and-drop ────────────────────────────────────────────────────
  function handleBundleDragStart(bundleId) { setDraggedBundleId(bundleId); setDragState(null); }
  function handleBundleDragOver(bundleId)  { setBundleDropTarget(bundleId); }

  function handleBundleDrop(targetBundleId) {
    if (!draggedBundleId || !onUpdateBundles || draggedBundleId === targetBundleId) {
      setDraggedBundleId(null); setBundleDropTarget(null); return;
    }
    const from = bundles.findIndex(b => b.id === draggedBundleId);
    const to   = bundles.findIndex(b => b.id === targetBundleId);
    if (from === -1 || to === -1) { setDraggedBundleId(null); setBundleDropTarget(null); return; }
    const reordered = [...bundles];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onUpdateBundles(reordered);
    setDraggedBundleId(null);
    setBundleDropTarget(null);
  }

  function handleBundleDragEnd() { setDraggedBundleId(null); setBundleDropTarget(null); }

  // ── Rename / Remove bundles ─────────────────────────────────────────────────
  function handleRenameBundle(bundleId, newLabel) {
    if (!onUpdateBundles) return;
    onUpdateBundles(bundles.map(b => b.id !== bundleId ? b : { ...b, label: newLabel }));
  }

  function handleRemoveBundle(bundleId) {
    if (!onUpdateBundles) return;
    onUpdateBundles(bundles.filter(b => b.id !== bundleId));
  }

  // ── Rename / Remove pleadings ───────────────────────────────────────────────
  function handleRenamePleading(bundleId, pleadingId, newDocType) {
    if (!onUpdateBundles) return;
    onUpdateBundles(bundles.map(b =>
      b.id !== bundleId ? b : {
        ...b,
        pleadings: b.pleadings.map(p => p.id !== pleadingId ? p : { ...p, docType: newDocType }),
      }
    ));
  }

  function handleRemovePleading(bundleId, pleadingId) {
    if (!onUpdateBundles) return;
    onUpdateBundles(bundles.map(b =>
      b.id !== bundleId ? b : {
        ...b,
        pleadings: b.pleadings.filter(p => p.id !== pleadingId),
      }
    ));
  }

  function handleAddBundle(label) {
    if (!onUpdateBundles) return;
    onUpdateBundles([...bundles, { id: `bundle-${Date.now()}`, label, pleadings: [] }]);
    setAddingBundle(false);
  }

  return (
    <div
      style={{ width }}
      className="bg-[#f8f9fb] border-l border-slate-200 flex flex-row flex-shrink-0 h-full relative"
      onDragOver={e => e.preventDefault()}
    >
      {/* Resize handle — left edge */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-10 group"
        title="גרור לשינוי רוחב"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 -ml-1 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-0.5">
            <span className="w-0.5 h-3 bg-blue-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-4 h-12 border-b border-slate-100 flex-shrink-0 flex items-center">
          <div className="text-[13px] font-bold text-slate-900">כתבי טענות</div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {bundles.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-slate-400">אין כתבי טענות לניתוח</div>
          ) : (
            bundles.map((bundle, i) => (
              <div key={bundle.id}>
                {i > 0 && <div className="h-2 bg-slate-100 border-y border-slate-200" />}
                <BundleSection
                  bundle={bundle}
                  selectedBundleId={selectedBundleId}
                  selectedPleadingId={selectedPleadingId}
                  selectedClaimId={selectedClaimId}
                  onSelectBundle={onSelectBundle}
                  onSelectPleading={onSelectPleading}
                  onSelectClaim={onSelectClaim}
                  onRenamePleading={handleRenamePleading}
                  onRemovePleading={handleRemovePleading}
                  onRenameBundle={(label) => handleRenameBundle(bundle.id, label)}
                  onRemoveBundle={() => handleRemoveBundle(bundle.id)}
                  dragState={dragState}
                  dropTarget={dropTarget}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onBundleDragStart={handleBundleDragStart}
                  onBundleDragOver={handleBundleDragOver}
                  onBundleDrop={handleBundleDrop}
                  onBundleDragEnd={handleBundleDragEnd}
                  isDraggingBundle={draggedBundleId === bundle.id}
                  isBundleDropTarget={bundleDropTarget === bundle.id && draggedBundleId !== bundle.id}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 flex-shrink-0">
          {addingBundle && (
            <NewBundleForm onConfirm={handleAddBundle} onCancel={() => setAddingBundle(false)} />
          )}
          <div className="p-3 flex gap-2">
            <button className="flex-1 py-[7px] border-[1.5px] border-dashed border-slate-300 rounded-[9px] text-[11.5px] text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all bg-transparent cursor-pointer">
              + העלה כתב טענות
            </button>
            <button
              onClick={() => setAddingBundle(v => !v)}
              className="px-3 py-[7px] border border-slate-200 rounded-[9px] text-[11px] text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all bg-transparent cursor-pointer flex-shrink-0"
              title="פתח אגד חדש"
            >+ אגד</button>
          </div>
        </div>
      </div>
    </div>
  );
}
