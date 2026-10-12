import { Component, computed, input } from '@angular/core';
import type { TaskProgressResponse } from '../api/generated';
import { asCount } from './dates';

@Component({
  selector: 'app-task-progress',
  templateUrl: './task-progress.html',
})
export class TaskProgress {
  readonly progress = input.required<TaskProgressResponse>();
  readonly taskCount = input.required<number>();

  protected readonly done = computed(() => asCount(this.progress().done));
  protected readonly counted = computed(() => asCount(this.progress().counted));
  protected readonly percent = computed(() =>
    Math.max(0, Math.min(100, Math.round(asCount(this.progress().ratio) * 100))),
  );
}
