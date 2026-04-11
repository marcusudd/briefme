/** Normalize bare domains / arXiv ids for detection (matches backend fetch rules). */
export function normalizeUrlForDetect(raw) {
  const t = (raw ?? "").trim();
  if (!t) return "";
  if (/^\d{4}\.\d{4,5}(v\d+)?$/i.test(t)) return `https://arxiv.org/abs/${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function detectSourceType(url) {
  const u = normalizeUrlForDetect(url);
  if (/youtube\.com|youtu\.be/i.test(u)) return "youtube";
  return "article";
}
