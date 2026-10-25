/** The download name for a relocation PDF. Matches the name the API sends. */
export function pdfFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\p{L}\p{N} _-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const base = (cleaned || 'Relocation').slice(0, 80).trim();
  return `${base}.pdf`;
}

export function summaryPdfFileName(name: string): string {
  const stem = pdfFileName(name).slice(0, -4);
  const withSummary = `${stem} summary`;
  const base = (withSummary.length > 80 ? withSummary.slice(0, 80) : withSummary).trim();
  return `${base || 'Relocation summary'}.pdf`;
}

export function savePdf(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
