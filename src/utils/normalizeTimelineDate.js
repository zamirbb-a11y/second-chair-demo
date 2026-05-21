const HEBREW_MONTHS = {
  ינואר: "01", פברואר: "02", מרץ: "03", אפריל: "04",
  מאי: "05", יוני: "06", יולי: "07", אוגוסט: "08",
  ספטמבר: "09", אוקטובר: "10", נובמבר: "11", דצמבר: "12",
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function validSortDate(str) {
  return ISO_RE.test(str) ? str : null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function buildDate(year, month, day) {
  return validSortDate(`${year}-${pad(month)}-${pad(day)}`);
}

export function normalizeTimelineDate(rawDate) {
  if (!rawDate) {
    return { displayDate: "מועד לא ידוע", sortDate: null, datePrecision: "unknown", isApproximate: false };
  }

  const str = String(rawDate).trim();
  const hasApproxMarker = /מדויק אינו ידוע|בערך|לערך|משוער|בסביבות|כ[־-]/.test(str);

  // ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return {
      displayDate: `${parseInt(d)}.${parseInt(m)}.${y}`,
      sortDate: str,
      datePrecision: "exact",
      isApproximate: hasApproxMarker,
    };
  }

  // DD.MM.YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return {
      displayDate: `${parseInt(d)}.${parseInt(m)}.${y}`,
      sortDate: buildDate(y, parseInt(m), parseInt(d)),
      datePrecision: "exact",
      isApproximate: hasApproxMarker,
    };
  }

  // Hebrew month + year
  for (const [heMonth, numMonthStr] of Object.entries(HEBREW_MONTHS)) {
    const yearMatch = str.match(new RegExp(`${heMonth}\\s+(\\d{4})`));
    if (!yearMatch) continue;

    const year = yearMatch[1];
    const month = parseInt(numMonthStr, 10);

    if (/סוף|בסוף/.test(str)) {
      return {
        displayDate: `סוף ${heMonth} ${year}`,
        sortDate: buildDate(year, month, 25),
        datePrecision: "month_end",
        isApproximate: true,
      };
    }

    if (/תחילת|בתחילת/.test(str)) {
      return {
        displayDate: `תחילת ${heMonth} ${year}`,
        sortDate: buildDate(year, month, 5),
        datePrecision: "month_start",
        isApproximate: true,
      };
    }

    if (/אמצע|באמצע/.test(str)) {
      return {
        displayDate: `אמצע ${heMonth} ${year}`,
        sortDate: buildDate(year, month, 15),
        datePrecision: "month_mid",
        isApproximate: true,
      };
    }

    return {
      displayDate: `${heMonth} ${year}`,
      sortDate: buildDate(year, month, 15),
      datePrecision: "month",
      isApproximate: hasApproxMarker,
    };
  }

  // Year only (bare "2021" or "בשנת 2021" or "במהלך 2021")
  const yearOnly = str.match(/(\d{4})/);
  if (yearOnly) {
    const y = yearOnly[1];
    let display = str;

    if (/^(\d{4})$/.test(str)) display = y;
    else if (/בסוף/.test(str)) display = `סוף ${y}`;
    else if (/תחילת|בתחילת/.test(str)) display = `תחילת ${y}`;
    else if (/אמצע|באמצע/.test(str)) display = `אמצע ${y}`;
    else if (/במהלך|בשנת|שנת/.test(str)) display = `${y}`;
    else display = y;

    const day = /בסוף/.test(str) ? 25 : /תחילת|בתחילת/.test(str) ? 5 : 15;
    const month = /בסוף/.test(str) ? 12 : /תחילת|בתחילת/.test(str) ? 1 : 6;

    return {
      displayDate: display,
      sortDate: buildDate(y, month, day),
      datePrecision: "year",
      isApproximate: true,
    };
  }

  // Fallback: strip approximation noise, keep readable text, no sort
  const cleaned = str.replace(/\s*[\[(]מועד מדויק אינו ידוע[^\])]*[\])]/i, "").trim();
  return {
    displayDate: cleaned || str,
    sortDate: null,
    datePrecision: "unknown",
    isApproximate: hasApproxMarker,
  };
}
