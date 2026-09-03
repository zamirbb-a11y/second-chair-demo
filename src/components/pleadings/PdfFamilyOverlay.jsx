// Renders the real, filed PDF via pdf.js (canvas per page) with Claim
// Family occurrences highlighted directly on it. Anchoring is purely
// positional — paragraph-number markers located via
// src/lib/pdfParagraphIndex.js — never by matching text content against
// the PDF's text layer, which a real document showed can be corrupted
// (broken font encoding) even when the page renders correctly.
//
// Highlight vocabulary is deliberately small: "active" (the currently
// selected family, one accent color) and "recurring" (any paragraph
// belonging to a family with more than one occurrence — a light, neutral
// "this repeats elsewhere" signal). Every other analyzed paragraph is
// still clickable, just unmarked, so a family with a single occurrence
// isn't visual noise.

import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildParagraphIndex } from "../../lib/pdfParagraphIndex.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const SCALE = 1.3;
const TONE_STYLES = {
  active: "bg-blue-400/20 ring-1 ring-blue-400",
  recurring: "bg-amber-400/10 hover:bg-amber-400/20",
  plain: "hover:bg-slate-400/10",
};

function familyParagraphs(family) {
  return [...new Set((family?.spans ?? []).map((s) => s.paragraph).filter((n) => n != null))];
}

function PdfPageCanvas({ pdfDoc, pageNumber, scale, regions, onRegionClick, registerRef }) {
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      if (cancelled) return;
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setSize({ width: viewport.width, height: viewport.height });
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div
      ref={registerRef}
      className="relative bg-white shadow-sm flex-shrink-0"
      style={size ? { width: size.width, height: size.height } : { width: 595 * scale, height: 842 * scale }}
    >
      <canvas ref={canvasRef} className="block" />
      {size && regions.map((r, i) => {
        const topCss = size.height - r.top * scale;
        const bottomCss = size.height - r.bottom * scale;
        return (
          <div
            key={`${r.paragraph}-${i}`}
            role="button"
            tabIndex={0}
            title={`פסקה ${r.paragraph}`}
            onClick={() => onRegionClick(r.paragraph)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRegionClick(r.paragraph); } }}
            className={["absolute right-0 left-0 cursor-pointer transition-colors", TONE_STYLES[r.tone]].join(" ")}
            style={{ top: topCss, height: Math.max(bottomCss - topCss, 4) }}
          />
        );
      })}
    </div>
  );
}

export default function PdfFamilyOverlay({ url, families, selectedFamilyId, onSelectFamily }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [paragraphIndex, setParagraphIndex] = useState(null);
  const [error, setError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const pageRefs = useRef({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        setPdfDoc(doc);

        const pages = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 1 });
          const content = await page.getTextContent();
          pages.push({
            pageNumber: p,
            height: viewport.height,
            items: content.items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] })),
          });
          if (!cancelled) setLoadingProgress({ done: p, total: doc.numPages });
        }
        if (!cancelled) setParagraphIndex(buildParagraphIndex(pages));
      } catch (err) {
        console.error("PDF overlay load failed:", err);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const familyByParagraph = useMemo(() => {
    const map = new Map();
    for (const f of families) for (const p of familyParagraphs(f)) map.set(p, f.id);
    return map;
  }, [families]);

  const recurringParagraphs = useMemo(() => {
    const set = new Set();
    for (const f of families) {
      const paras = familyParagraphs(f);
      if (paras.length > 1) for (const p of paras) set.add(p);
    }
    return set;
  }, [families]);

  const selectedFamily = families.find((f) => f.id === selectedFamilyId) ?? null;
  const selectedParagraphs = useMemo(
    () => new Set(familyParagraphs(selectedFamily)),
    [selectedFamily]
  );

  function handleRegionClick(paragraphNumber) {
    const familyId = familyByParagraph.get(paragraphNumber) ?? null;
    onSelectFamily(familyId === selectedFamilyId ? null : familyId);
  }

  // Computed directly via getBoundingClientRect rather than
  // scrollIntoView — deterministic and independent of ancestor
  // positioning/RTL-nesting quirks scrollIntoView is sensitive to.
  useEffect(() => {
    if (!selectedFamily || !paragraphIndex) return;
    const paras = familyParagraphs(selectedFamily);
    const firstPage = paras.length ? paragraphIndex.index.get(paras[0])?.regions?.[0]?.page : null;
    const container = containerRef.current;
    const target = firstPage ? pageRefs.current[firstPage] : null;
    if (!container || !target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta = targetRect.top - containerRect.top;
    const centered = delta - (container.clientHeight - target.clientHeight) / 2;
    container.scrollTo({ top: container.scrollTop + centered, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamilyId, paragraphIndex]);

  if (error) {
    return <p className="p-6 text-sm text-slate-500">לא הצלחתי לטעון את המסמך המקורי.</p>;
  }
  if (!pdfDoc || !paragraphIndex) {
    return (
      <p className="p-6 text-sm text-slate-500">
        טוען את המסמך המקורי{loadingProgress ? ` (${loadingProgress.done}/${loadingProgress.total})` : "…"}
      </p>
    );
  }

  const regionsForPage = (pageNumber) => {
    const regions = [];
    for (const [paragraph, entry] of paragraphIndex.index) {
      if (!familyByParagraph.has(paragraph)) continue;
      for (const region of entry.regions) {
        if (region.page !== pageNumber) continue;
        const tone = selectedParagraphs.has(paragraph) ? "active" : recurringParagraphs.has(paragraph) ? "recurring" : "plain";
        regions.push({ ...region, paragraph, tone });
      }
    }
    return regions;
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-slate-100 py-6 flex flex-col items-center gap-4">
      {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNumber) => (
        <PdfPageCanvas
          key={pageNumber}
          registerRef={(el) => { pageRefs.current[pageNumber] = el; }}
          pdfDoc={pdfDoc}
          pageNumber={pageNumber}
          scale={SCALE}
          regions={regionsForPage(pageNumber)}
          onRegionClick={handleRegionClick}
        />
      ))}
    </div>
  );
}
