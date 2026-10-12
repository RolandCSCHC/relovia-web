import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiOrigin } from '../core/api-origin';
import { credentialsInterceptor } from '../core/credentials.interceptor';
import { ApiError, ReloviaClient } from './relovia-client';

describe('ReloviaClient', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('sends purpose and status as names', async () => {
    const pending = TestBed.inject(ReloviaClient).createRelocation({
      name: 'Berlin move',
      originCountryCode: 'CL',
      originCity: 'Santiago',
      destinationCountryCode: 'DE',
      destinationCity: 'Berlin',
      targetDate: '2026-12-01',
      purpose: 'Work',
      status: 'Draft',
    });
    const request = await nextRequest(`${apiOrigin}/api/relocations`);

    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toMatchObject({ purpose: 'Work', status: 'Draft' });
    request.flush(relocationBody());

    await expect(pending).resolves.toMatchObject({ name: 'Berlin move' });
  });

  it('keeps a validation message from the API', async () => {
    const pending = TestBed.inject(ReloviaClient).createRelocation({
      name: '',
      originCountryCode: 'CL',
      originCity: 'Santiago',
      destinationCountryCode: 'DE',
      destinationCity: 'Berlin',
      targetDate: '2026-12-01',
      purpose: 'Work',
      status: 'Draft',
    });
    (await nextRequest(`${apiOrigin}/api/relocations`)).flush(
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { name: ['Name is required.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({
      fields: { name: 'Name is required.' },
    });
  });
});

async function nextRequest(url: string) {
  const http = TestBed.inject(HttpTestingController);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const matches = http.match(url);
    if (matches.length === 1) {
      return matches[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error(`No request for ${url}`);
}

function relocationBody() {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000099',
    name: 'Berlin move',
    originCountryCode: 'CL',
    originCity: 'Santiago',
    destinationCountryCode: 'DE',
    destinationCity: 'Berlin',
    targetDate: '2026-12-01',
    purpose: 'Work',
    status: 'Draft',
    isInternational: true,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z',
  };
}
