import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { RelocationResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { relocationId } from './relocation-id';
import { RelocationShell } from './relocation-shell';

const relocationIdValue = '0199f0a1-7c00-7000-8000-000000000010';

@Component({ template: '<p>Tasks body</p>' })
class TasksBody {}

@Component({ template: '<p>Budget {{ id() }}</p>' })
class BudgetBody {
  protected readonly id = relocationId();
}

describe('RelocationShell', () => {
  function setup(international: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'relocations/:id',
            component: RelocationShell,
            children: [
              { path: '', component: TasksBody },
              { path: 'budget', component: BudgetBody },
            ],
          },
        ]),
        {
          provide: ReloviaClient,
          useValue: {
            getRelocation: () => Promise.resolve(relocation(international)),
          },
        },
      ],
    });
  }

  it('keeps the same tab bar when the feature changes', async () => {
    setup(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/relocations/${relocationIdValue}`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    const title = root.querySelector('h1');
    const tabs = root.querySelector('nav');

    expect(title?.textContent).toContain('Berlin move');
    expect(root.textContent).toContain('Santiago, Chile to Berlin, Germany');
    expect(root.textContent).toContain('Download PDF');
    expect(title!.compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(tabs?.textContent).toContain('Tasks');
    expect(
      root.querySelector(`a[href="/relocations/${relocationIdValue}/housing"]`),
    ).not.toBeNull();
    expect(root.textContent).toContain('Tasks body');

    await harness.navigateByUrl(`/relocations/${relocationIdValue}/budget`);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('h1')).toBe(title);
    expect(harness.routeNativeElement!.textContent).toContain('Download PDF');
    expect(harness.routeNativeElement!.querySelector('nav')).toBe(tabs);
    expect(harness.routeNativeElement!.textContent).toContain(`Budget ${relocationIdValue}`);
    expect(harness.routeNativeElement!.textContent).not.toContain('Tasks body');
    expect(
      harness
        .routeNativeElement!.querySelector(`a[href="/relocations/${relocationIdValue}/budget"]`)
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('hides housing until the move is known to be international', async () => {
    setup(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/relocations/${relocationIdValue}`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement!;

    expect(root.querySelector(`a[href="/relocations/${relocationIdValue}/housing"]`)).toBeNull();
    expect(root.querySelector(`a[href="/relocations/${relocationIdValue}/budget"]`)).not.toBeNull();
  });
});

function relocation(international: boolean): RelocationResponse {
  return {
    id: relocationIdValue,
    name: 'Berlin move',
    originCountryCode: 'CL',
    originCity: 'Santiago',
    destinationCountryCode: international ? 'DE' : 'CL',
    destinationCity: international ? 'Berlin' : 'Valparaíso',
    targetDate: '2026-12-01',
    purpose: 'Work',
    status: 'Active',
    isInternational: international,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z',
  };
}
