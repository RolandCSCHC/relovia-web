import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiOrigin } from './api-origin';
import { Session } from './session';

describe('Session', () => {
  let http: HttpTestingController;
  let session: Session;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(Session);
  });

  afterEach(() => {
    http.verify();
  });

  it('clears the current user after sign-out', async () => {
    const loaded = firstValueFrom(session.ensureLoaded());
    http.expectOne(`${apiOrigin}/api/auth/me`).flush({
      id: '0199c8e0-7b2a-7c3d-8e4f-1a2b3c4d5e6f',
      email: 'person@example.com',
      displayName: 'Person Example',
      avatarUrl: null,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      hasAccess: true,
    });
    await loaded;

    const signedOut = firstValueFrom(session.signOut());
    http.expectOne(`${apiOrigin}/api/auth/logout`).flush('');
    await signedOut;

    expect(session.user()).toBeNull();
  });
});
