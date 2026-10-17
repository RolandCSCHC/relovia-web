import { TestBed } from '@angular/core/testing';
import { Session } from '../core/session';
import { EarlyAccess } from './early-access';

describe('EarlyAccess', () => {
  it('thanks a signed-in user and says there is nothing to use yet', () => {
    TestBed.inject(Session).user.set({
      id: '0199c8e0-7b2a-7c3d-8e4f-1a2b3c4d5e6f',
      email: 'person@example.com',
      displayName: 'Person Example',
      avatarUrl: null,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      hasAccess: false,
    });
    const fixture = TestBed.createComponent(EarlyAccess);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Thanks for your interest');
    expect(text).toContain('person@example.com');
    expect(text).toContain('nothing to use yet');
  });
});
