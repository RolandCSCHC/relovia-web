import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RelocationTabs } from './relocation-tabs';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

@Component({ template: '' })
class Blank {}

describe('RelocationTabs', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'relocations/:id', component: Blank },
          { path: 'relocations/:id/housing', component: Blank },
        ]),
      ],
    });
  });

  it('links the features and hides housing on a domestic move', async () => {
    const fixture = TestBed.createComponent(RelocationTabs);
    fixture.componentRef.setInput('relocationId', relocationId);
    fixture.componentRef.setInput('international', false);
    await TestBed.inject(Router).navigateByUrl(`/relocations/${relocationId}`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector(`a[href="/relocations/${relocationId}"]`)?.textContent).toContain(
      'Tasks',
    );
    expect(root.querySelector(`a[href="/relocations/${relocationId}/budget"]`)).not.toBeNull();
    expect(root.querySelector(`a[href="/relocations/${relocationId}/summary"]`)).not.toBeNull();
    expect(root.querySelector(`a[href="/relocations/${relocationId}/housing"]`)).toBeNull();
    expect(root.querySelector(`a[href="/relocations/${relocationId}/applications"]`)).toBeNull();
    expect(
      root.querySelector(`a[href="/relocations/${relocationId}"]`)?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('includes housing and applications on an international move', async () => {
    const fixture = TestBed.createComponent(RelocationTabs);
    fixture.componentRef.setInput('relocationId', relocationId);
    fixture.componentRef.setInput('international', true);
    await TestBed.inject(Router).navigateByUrl(`/relocations/${relocationId}/housing`);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector(`a[href="/relocations/${relocationId}/housing"]`)).not.toBeNull();
    expect(
      root.querySelector(`a[href="/relocations/${relocationId}/applications"]`),
    ).not.toBeNull();
    expect(
      root
        .querySelector(`a[href="/relocations/${relocationId}/housing"]`)
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      root.querySelector(`a[href="/relocations/${relocationId}"]`)?.getAttribute('aria-selected'),
    ).toBe('false');
  });
});
