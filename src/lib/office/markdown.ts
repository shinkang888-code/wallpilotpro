export function normalizeMarkdown(md: string): string {
  let s = (md || "").replace(/\r\n/g, "\n").trim();
  if (!s) return s;

  s = s.replace(/([^\n#])(#{1,6}\s+)/g, "$1\n\n$2");
  s = s.replace(/([^\n*])(\*\*[^*\n]+:\*\*)/g, "$1\n\n$2");
  s = s.replace(/(\*\*[^*\n]+:\*\*)(-\s+)/g, "$1\n$2");
  s = s.replace(/([.:)])(\s*)(-\s+)/g, "$1\n$3");
  s = s.replace(/([가-힣a-zA-Z)])(-\s+(?=\*\*|[가-힣A-Za-z]))/g, "$1\n$2");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s;
}
