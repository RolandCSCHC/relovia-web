import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { googleSignInUrl } from '../core/api-origin';
import { SignIn } from './sign-in';

@Component({
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class Outlet {}

describe('SignIn', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'sign-in', component: SignIn }])],
    });
  });

  it('links to Google sign-in on the API', async () => {
    const fixture = TestBed.createComponent(Outlet);
    await TestBed.inject(Router).navigateByUrl('/sign-in');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.textContent).toContain('Continue with Google');
    expect(link?.getAttribute('href')).toBe(googleSignInUrl);
  });

  it('explains a sign-in error from the API redirect', async () => {
    const fixture = TestBed.createComponent(Outlet);
    await TestBed.inject(Router).navigateByUrl('/sign-in?error=email-in-use');
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('different Google account');
  });
});
