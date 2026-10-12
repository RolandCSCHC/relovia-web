import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ApiError, ReloviaClient } from '../api/relovia-client';

@Component({
  selector: 'app-city-field',
  templateUrl: './city-field.html',
  styleUrl: './city-field.scss',
})
export class CityField {
  private readonly api = inject(ReloviaClient);
  private generation = 0;

  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly required = input(false);
  readonly countryCode = input('');
  readonly value = input('');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  readonly valueChange = output<string>();

  protected readonly cities = signal<readonly string[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const country = this.countryCode().trim();
      const generation = ++this.generation;
      if (country.length !== 2) {
        this.cities.set([]);
        this.loading.set(false);
        this.error.set(null);
        return;
      }

      this.loading.set(true);
      this.error.set(null);
      void this.load(generation, country);
    });
  }

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }

  private async load(generation: number, country: string): Promise<void> {
    try {
      const cities = await this.api.listCities(country);
      if (generation !== this.generation) {
        return;
      }

      const current = this.value().trim();
      this.cities.set(current && !cities.includes(current) ? [current, ...cities] : cities);
      this.loading.set(false);
    } catch (error) {
      if (generation !== this.generation) {
        return;
      }

      this.cities.set([]);
      this.loading.set(false);
      this.error.set(error instanceof ApiError ? error.message : 'City names could not be loaded.');
    }
  }
}
