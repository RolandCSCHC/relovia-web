import { asCount } from '../relocations/dates';

export const maxDocumentBytes = 10 * 1024 * 1024;

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

export function documentFileProblem(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  const name = file.name.trim();
  if (
    !name ||
    name.length > 200 ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    return 'Use a file name of 200 characters or fewer, without a path.';
  }

  if (file.size === 0) {
    return 'Choose a file that is not empty.';
  }

  if (file.size > maxDocumentBytes) {
    return 'The file must be 10 MB or smaller.';
  }

  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  const typeOk = file.type === '' || allowedTypes.has(file.type);
  if (!typeOk || !allowedExtensions.has(extension)) {
    return 'Upload a PDF, JPEG, PNG, or WebP file.';
  }

  return null;
}

export function formatBytes(value: number | string): string {
  const bytes = asCount(value);
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A calendar date is expired when it is before today in the local timezone. */
export function isExpired(isoDate: string, today = localToday()): boolean {
  return isoDate < today;
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
