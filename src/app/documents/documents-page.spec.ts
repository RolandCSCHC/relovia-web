import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  DocumentResponse,
  RelocationResponse,
  RelocationTaskResponse,
  UpdateDocumentRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { DocumentsPage } from './documents-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const documentId = '0199f0a1-7c00-7000-8000-000000000061';
const taskId = '0199f0a1-7c00-7000-8000-000000000021';

describe('DocumentsPage', () => {
  it('shows a file with its category, expiration, and task', async () => {
    const harness = await open({
      listDocuments: () => Promise.resolve([passport()]),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('passport.pdf');
    expect(root.textContent).toContain('Visa');
    expect(root.textContent).toContain('Expired');
    expect(root.textContent).toContain('Supports Give notice');
    expect(root.textContent).toContain('12 KB');
  });

  it('refuses a text file before calling the API', async () => {
    let uploaded = false;
    const harness = await open({
      createDocument: () => {
        uploaded = true;
        return Promise.resolve(passport());
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('No documents yet.');
    expect(root.querySelector('#document-file')).toBeNull();
    clickButton(root, 'Add document');
    harness.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(root.textContent).toContain('Choose a file.');
    setFile(
      root.querySelector('#document-file'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(uploaded).toBe(false);
    expect(root.textContent).toContain('Upload a PDF, JPEG, PNG, or WebP file.');
  });

  it('uploads a pdf and saves its category, expiration, and task', async () => {
    let uploaded: File | undefined;
    let saved: UpdateDocumentRequest | undefined;
    const stored: DocumentResponse[] = [];
    const harness = await open({
      listDocuments: () => Promise.resolve([...stored]),
      createDocument: (_id: string, file: File) => {
        uploaded = file;
        stored.push({ ...passport(), category: null, expiresOn: null, taskIds: [] });
        return Promise.resolve(stored[0]);
      },
      updateDocument: (_id: string, _documentId: string, body: UpdateDocumentRequest) => {
        saved = body;
        stored[0] = {
          ...stored[0],
          category: body.category ?? null,
          expiresOn: body.expiresOn ?? null,
          taskIds: body.taskIds ?? [],
        };
        return Promise.resolve(stored[0]);
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add document');
    harness.detectChanges();
    setFile(
      root.querySelector('#document-file'),
      new File(['%PDF'], 'passport.pdf', { type: 'application/pdf' }),
    );
    setSelect(root.querySelector('#upload-category'), 'Visa');
    setValue(root.querySelector('#upload-expires'), '2027-04-01');
    checkTask(root, 'Give notice');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(uploaded?.name).toBe('passport.pdf');
    expect(root.querySelector('[role="dialog"]')).toBeNull();

    expect(saved).toEqual({
      category: 'Visa',
      expiresOn: '2027-04-01',
      taskIds: [taskId],
    });
    expect(root.textContent).toContain('Visa');
    expect(root.textContent).toContain('Supports Give notice');
  });

  it('downloads and deletes a document', async () => {
    let downloaded: string | undefined;
    let deleted: string | undefined;
    const stored = [passport()];
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:passport');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const harness = await open({
      listDocuments: () => Promise.resolve([...stored]),
      downloadDocument: (_relocationId: string, id: string) => {
        downloaded = id;
        return Promise.resolve(new Blob(['%PDF']));
      },
      deleteDocument: (_relocationId: string, id: string) => {
        deleted = id;
        stored.splice(0, stored.length);
        return Promise.resolve();
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Download');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(downloaded).toBe(documentId);
    expect(createObjectUrl).toHaveBeenCalled();

    clickButton(root, 'Delete document');
    harness.detectChanges();
    clickButton(root, 'Delete document');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(deleted).toBe(documentId);
    expect(root.textContent).toContain('No documents yet.');
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/documents', component: DocumentsPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          listDocuments: () => Promise.resolve([]),
          listTasks: () =>
            Promise.resolve({ progress: { done: 0, counted: 1, ratio: 0 }, tasks: [task()] }),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/documents`);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

function clickButton(root: HTMLElement, name: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === name,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${name}`);
  }

  button.click();
}

function setValue(input: Element | null, value: string): void {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Missing input');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(input: Element | null, value: string): void {
  if (!(input instanceof HTMLSelectElement)) {
    throw new Error('Missing select');
  }

  input.value = value;
  input.dispatchEvent(new Event('change'));
}

function setFile(input: Element | null, file: File): void {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Missing file input');
  }

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: { 0: file, length: 1, item: (index: number) => (index === 0 ? file : null) },
  });
  input.dispatchEvent(new Event('change'));
}

function checkTask(root: HTMLElement, title: string): void {
  const label = [...root.querySelectorAll('label.check')].find((item) =>
    item.textContent?.includes(title),
  );
  const input = label?.querySelector('input');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing task ${title}`);
  }

  input.checked = true;
  input.dispatchEvent(new Event('change'));
}

function relocation(): RelocationResponse {
  return {
    id: relocationId,
    name: 'Wellington move',
    originCountryCode: 'CL',
    originCity: 'Santiago',
    destinationCountryCode: 'NZ',
    destinationCity: 'Wellington',
    targetDate: '2026-12-01',
    purpose: 'Work',
    status: 'Active',
    isInternational: true,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z',
  };
}

function task(): RelocationTaskResponse {
  return {
    id: taskId,
    code: 'give-notice',
    title: 'Give notice',
    description: null,
    url: null,
    daysBeforeMove: 60,
    dueDate: '2026-10-02',
    phase: 'Housing',
    priority: 'High',
    status: 'Todo',
    sourceTemplateTaskId: null,
    dependencies: [],
    documentIds: [documentId],
    position: 0,
  };
}

function passport(): DocumentResponse {
  return {
    id: documentId,
    fileName: 'passport.pdf',
    contentType: 'application/pdf',
    sizeBytes: 12 * 1024,
    createdAt: '2026-10-24T13:50:00.000Z',
    category: 'Visa',
    expiresOn: '2020-01-01',
    taskIds: [taskId],
  };
}
