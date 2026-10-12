import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReloviaClient } from '../api/relovia-client';
import { CityField } from './city-field';

describe('CityField', () => {
  it('loads the cities for the selected country', async () => {
    let country = '';
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReloviaClient,
          useValue: {
            listCities: (code: string) => {
              country = code;
              return Promise.resolve(['Berlin', 'Munich']);
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('#origin-city') as HTMLSelectElement;

    expect(country).toBe('DE');
    expect(select.textContent).toContain('Berlin');
    expect(select.textContent).toContain('Munich');

    select.value = 'Munich';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.city()).toBe('Munich');
  });
});

@Component({
  imports: [CityField],
  template: `
    <app-city-field
      inputId="origin-city"
      label="City"
      [required]="true"
      [countryCode]="country()"
      [value]="city()"
      (valueChange)="city.set($event)"
    />
  `,
})
class Host {
  readonly country = signal('DE');
  readonly city = signal('');
}
