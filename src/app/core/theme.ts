import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

const storageKey = 'relovia-color-scheme';

@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);

  readonly scheme = signal<ColorScheme>(readStoredScheme());

  constructor() {
    effect(() => {
      const scheme = this.scheme();
      this.document.documentElement.style.colorScheme = scheme;
      localStorage.setItem(storageKey, scheme);
    });
  }

  toggle(): void {
    this.scheme.update((scheme) => (scheme === 'dark' ? 'light' : 'dark'));
  }
}

function readStoredScheme(): ColorScheme {
  const stored = localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}
