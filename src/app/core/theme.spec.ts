import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  it('switches the document between light and dark', () => {
    const theme = TestBed.inject(Theme);
    const root = TestBed.inject(DOCUMENT).documentElement;
    TestBed.flushEffects();

    expect(theme.scheme()).toBe('light');
    expect(root.style.colorScheme).toBe('light');

    theme.toggle();
    TestBed.flushEffects();

    expect(theme.scheme()).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('relovia-color-scheme')).toBe('dark');
  });

  it('restores a stored color scheme', () => {
    localStorage.setItem('relovia-color-scheme', 'dark');

    const theme = TestBed.inject(Theme);

    expect(theme.scheme()).toBe('dark');
  });
});
