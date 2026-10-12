import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { googleSignInUrl } from '../core/api-origin';

const signInErrors: Record<string, string> = {
  'email-in-use': 'That email is already used by a different Google account.',
  'unverified-email': 'Google has not verified this email address.',
  'invalid-profile': 'Google did not return a usable profile.',
  'google-denied': 'Google sign-in was cancelled.',
  'google-sign-in-failed': 'Google sign-in failed. Try again.',
};

@Component({
  selector: 'app-sign-in',
  imports: [MatButton],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  protected readonly signInUrl = googleSignInUrl;

  private readonly errorCode = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('error'))),
  );

  protected readonly errorMessage = computed(() => {
    const code = this.errorCode();
    if (!code) {
      return null;
    }

    return signInErrors[code] ?? 'Sign-in failed. Try again.';
  });
}
