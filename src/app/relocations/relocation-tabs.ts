import { Component, computed, input } from '@angular/core';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface RelocationTab {
  label: string;
  commands: string[];
}

@Component({
  selector: 'app-relocation-tabs',
  imports: [MatTabLink, MatTabNav, MatTabNavPanel, RouterLink, RouterLinkActive],
  templateUrl: './relocation-tabs.html',
  styleUrl: './relocation-tabs.scss',
})
export class RelocationTabs {
  readonly relocationId = input.required<string>();
  readonly international = input(false);

  protected readonly tabs = computed(() => {
    const id = this.relocationId();
    const tabs: RelocationTab[] = [
      { label: 'Tasks', commands: ['/relocations', id] },
      { label: 'Inventory', commands: ['/relocations', id, 'inventory'] },
      { label: 'Budget', commands: ['/relocations', id, 'budget'] },
      { label: 'Documents', commands: ['/relocations', id, 'documents'] },
      { label: 'Calendar', commands: ['/relocations', id, 'calendar'] },
    ];
    if (this.international()) {
      tabs.push(
        { label: 'Housing', commands: ['/relocations', id, 'housing'] },
        { label: 'Applications', commands: ['/relocations', id, 'applications'] },
      );
    }
    tabs.push({ label: 'Summary', commands: ['/relocations', id, 'summary'] });
    return tabs;
  });
}
