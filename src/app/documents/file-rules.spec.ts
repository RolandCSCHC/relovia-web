import { documentFileProblem, formatBytes, isExpired, maxDocumentBytes } from './file-rules';

describe('document files', () => {
  it('accepts a pdf, jpeg, png, or webp within 10 MB', () => {
    expect(documentFileProblem(file('visa.pdf', 'application/pdf', 1200))).toBeNull();
    expect(documentFileProblem(file('photo.JPEG', 'image/jpeg', 1200))).toBeNull();
    expect(documentFileProblem(file('scan.png', '', 1200))).toBeNull();
    expect(documentFileProblem(file('card.webp', 'image/webp', maxDocumentBytes))).toBeNull();
  });

  it('rejects an empty file, a file over 10 MB, and a file that is not an allowed type', () => {
    expect(documentFileProblem(file('empty.pdf', 'application/pdf', 0))).toBe(
      'Choose a file that is not empty.',
    );
    expect(documentFileProblem(file('huge.pdf', 'application/pdf', maxDocumentBytes + 1))).toBe(
      'The file must be 10 MB or smaller.',
    );
    expect(documentFileProblem(file('notes.txt', 'text/plain', 12))).toBe(
      'Upload a PDF, JPEG, PNG, or WebP file.',
    );
    expect(documentFileProblem(file('passport', 'application/pdf', 12))).toBe(
      'Upload a PDF, JPEG, PNG, or WebP file.',
    );
  });

  it('formats a size and treats a past calendar date as expired', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(isExpired('2020-01-01', '2026-10-24')).toBe(true);
    expect(isExpired('2026-10-24', '2026-10-24')).toBe(false);
  });
});

function file(name: string, type: string, size: number) {
  return { name, type, size };
}
