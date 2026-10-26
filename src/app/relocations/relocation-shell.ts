import { Component, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import type { RelocationResponse } from '../api/generated';
import { ApiError, ReloviaClient } from '../api/relovia-client';
import { pdfFileName, savePdf } from '../export/file-name';
import { countryName } from './countries';
import { relocationId } from './relocation-id';
import { RelocationTabs } from './relocation-tabs';

@Component({
  selector: 'app-relocation-shell',
  imports: [MatButton, RelocationTabs, RouterLink, RouterOutlet],
  templateUrl: './relocation-shell.html',
  styleUrl: './relocation-shell.scss',
})
export class RelocationShell {
  private readonly api = inject(ReloviaClient);
  private readonly router = inject(Router);

  protected readonly confirmingDelete = signal(false);
  protected readonly downloading = signal(false);
  protected readonly saving = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly id = relocationId();
  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected place(relocation: RelocationResponse, end: 'origin' | 'destination'): string {
    const city = end === 'origin' ? relocation.originCity : relocation.destinationCity;
    const country =
      end === 'origin' ? relocation.originCountryCode : relocation.destinationCountryCode;
    return city.trim() ? `${city}, ${countryName(country)}` : countryName(country);
  }

  protected async downloadPdf(): Promise<void> {
    const id = this.id();
    const relocation = this.relocation.value();
    if (!id || !relocation) {
      return;
    }

    this.downloading.set(true);
    this.actionError.set(null);
    try {
      const blob = await this.api.downloadRelocationPdf(id);
      savePdf(blob, pdfFileName(relocation.name));
    } catch (error) {
      this.actionError.set(this.failure(error, 'The PDF could not be downloaded.'));
    } finally {
      this.downloading.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.api.deleteRelocation(id);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.saving.set(false);
      this.actionError.set(this.failure(error, 'The relocation could not be deleted.'));
    }
  }

  private failure(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}
