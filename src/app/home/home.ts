import { Component, inject, resource } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { RelocationResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { countryName } from '../relocations/countries';
import { formatDate } from '../relocations/dates';
import { labelFor, purposes, relocationStatuses } from '../relocations/labels';
import { TaskProgress } from '../relocations/task-progress';

@Component({
  selector: 'app-home',
  imports: [MatButton, RouterLink, TaskProgress],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly api = inject(ReloviaClient);

  protected readonly cards = resource({
    defaultValue: [],
    loader: async () => {
      const relocations = await this.api.listRelocations();
      return Promise.all(
        relocations.map(async (relocation) => ({
          relocation,
          tasks: await this.api.listTasks(relocation.id),
        })),
      );
    },
  });

  protected details(relocation: RelocationResponse): string {
    return [
      relocation.targetDate ? formatDate(relocation.targetDate) : null,
      this.scope(relocation),
      this.purpose(relocation),
      this.status(relocation),
    ]
      .filter((part) => part !== null)
      .join(' · ');
  }

  protected place(relocation: RelocationResponse, end: 'origin' | 'destination'): string {
    const city = end === 'origin' ? relocation.originCity : relocation.destinationCity;
    const country =
      end === 'origin' ? relocation.originCountryCode : relocation.destinationCountryCode;
    return city.trim() ? `${city}, ${countryName(country)}` : countryName(country);
  }

  protected purpose(relocation: RelocationResponse): string {
    return labelFor(purposes, relocation.purpose);
  }

  protected status(relocation: RelocationResponse): string {
    return labelFor(relocationStatuses, relocation.status);
  }

  protected scope(relocation: RelocationResponse): string {
    return relocation.isInternational ? 'International' : 'Domestic';
  }
}
