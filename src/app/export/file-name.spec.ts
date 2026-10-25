import { pdfFileName, summaryPdfFileName } from './file-name';

describe('pdfFileName', () => {
  it('keeps letters and drops the rest', () => {
    expect(pdfFileName(' Berlin/move! ')).toBe('Berlin move.pdf');
    expect(pdfFileName('   ')).toBe('Relocation.pdf');
    expect(pdfFileName('a'.repeat(90))).toBe(`${'a'.repeat(80)}.pdf`);
    expect(summaryPdfFileName('Berlin move')).toBe('Berlin move summary.pdf');
    expect(summaryPdfFileName('a'.repeat(90))).toBe(`${'a'.repeat(80)}.pdf`);
  });
});
