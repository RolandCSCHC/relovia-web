import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiOrigin } from './api-origin';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
  });

  it('sends the session cookie and antiforgery header on a mutating API request', () => {
    document.cookie = 'XSRF-TOKEN=request-token';

    http.post(`${apiOrigin}/api/auth/logout`, null).subscribe();

    const request = backend.expectOne(`${apiOrigin}/api/auth/logout`);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('request-token');
    request.flush(null);
  });

  it('sends the session cookie without an antiforgery header on a read', () => {
    document.cookie = 'XSRF-TOKEN=request-token';

    http.get(`${apiOrigin}/api/auth/me`).subscribe();

    const request = backend.expectOne(`${apiOrigin}/api/auth/me`);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    request.flush(null);
  });

  it('leaves requests to other origins unchanged', () => {
    document.cookie = 'XSRF-TOKEN=request-token';

    http.post('https://example.com/api', {}).subscribe();

    const request = backend.expectOne('https://example.com/api');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    request.flush(null);
  });
});
