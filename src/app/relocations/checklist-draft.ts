import type {
  ConfirmChecklistTaskRequest,
  SuggestedTaskResponse,
  TaskPhase,
  TaskPriority,
} from '../api/generated';
import { asCount } from './dates';

export interface DraftTask {
  selected: boolean;
  code: string;
  title: string;
  daysBeforeMove: string;
  phase: TaskPhase;
  priority: TaskPriority;
  dependsOnCodes: string[];
}

export function draftsFromSuggestion(tasks: SuggestedTaskResponse[]): DraftTask[] {
  return tasks.map((task) => ({
    selected: true,
    code: task.code,
    title: task.title,
    daysBeforeMove: String(asCount(task.daysBeforeMove)),
    phase: task.phase,
    priority: task.priority,
    dependsOnCodes: task.dependsOnCodes,
  }));
}

export function checklistSelection(
  drafts: readonly DraftTask[],
): { tasks: ConfirmChecklistTaskRequest[] } | { errors: string[] } {
  const errors = new Set<string>();
  const tasks: ConfirmChecklistTaskRequest[] = [];
  for (const draft of drafts) {
    if (!draft.selected) {
      continue;
    }

    const title = draft.title.trim();
    const days = draft.daysBeforeMove.trim();
    if (!title) {
      errors.add('Title is required.');
    } else if (title.length > 200) {
      errors.add('Title must be 200 characters or fewer.');
    }

    if (!/^-?\d+$/.test(days)) {
      errors.add('Days before the move must be a whole number.');
    }

    if (errors.size > 0) {
      continue;
    }

    tasks.push({
      code: draft.code,
      title,
      daysBeforeMove: Number(days),
      phase: draft.phase,
      priority: draft.priority,
    });
  }

  if (errors.size > 0) {
    return { errors: [...errors] };
  }

  return { tasks };
}
