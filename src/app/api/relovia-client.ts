import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { createClient } from './generated/client';
import * as reloviaApi from './generated/sdk.gen';
import type {
  ChecklistSuggestionResponse,
  ConfirmChecklistRequest,
  CreateRelocationTaskRequest,
  RelocationResponse,
  RelocationTaskResponse,
  RelocationTasksResponse,
  SaveRelocationRequest,
  UpdateRelocationTaskRequest,
} from './generated/types.gen';
import { createClientConfig } from './hey-api';

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Readonly<Record<string, string>>;

  constructor(message: string, status = 0, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

@Injectable({ providedIn: 'root' })
export class ReloviaClient {
  private readonly client = createClient(createClientConfig({ httpClient: inject(HttpClient) }));

  listRelocations(): Promise<RelocationResponse[]> {
    return this.unwrap(
      reloviaApi.listRelocations({ client: this.client, throwOnError: true }),
      'Relocations could not be loaded.',
    );
  }

  getRelocation(id: string): Promise<RelocationResponse> {
    return this.unwrap(
      reloviaApi.getRelocation({ client: this.client, path: { id }, throwOnError: true }),
      'The relocation could not be loaded.',
    );
  }

  createRelocation(body: SaveRelocationRequest): Promise<RelocationResponse> {
    return this.unwrap(
      reloviaApi.createRelocation({ client: this.client, body, throwOnError: true }),
      'The relocation could not be saved.',
    );
  }

  updateRelocation(id: string, body: SaveRelocationRequest): Promise<RelocationResponse> {
    return this.unwrap(
      reloviaApi.updateRelocation({ client: this.client, path: { id }, body, throwOnError: true }),
      'The relocation could not be saved.',
    );
  }

  async deleteRelocation(id: string): Promise<void> {
    try {
      await reloviaApi.deleteRelocation({ client: this.client, path: { id }, throwOnError: true });
    } catch (error) {
      throw toApiError(error, 'The relocation could not be deleted.');
    }
  }

  getChecklistSuggestion(relocationId: string): Promise<ChecklistSuggestionResponse> {
    return this.unwrap(
      reloviaApi.getChecklistSuggestion({
        client: this.client,
        path: { relocationId },
        throwOnError: true,
      }),
      'The checklist could not be loaded.',
    );
  }

  confirmChecklist(
    relocationId: string,
    body: ConfirmChecklistRequest,
  ): Promise<RelocationTasksResponse> {
    return this.unwrap(
      reloviaApi.confirmChecklist({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The checklist could not be confirmed.',
    );
  }

  listTasks(relocationId: string): Promise<RelocationTasksResponse> {
    return this.unwrap(
      reloviaApi.listRelocationTasks({
        client: this.client,
        path: { relocationId },
        throwOnError: true,
      }),
      'Tasks could not be loaded.',
    );
  }

  updateTask(
    relocationId: string,
    taskId: string,
    body: UpdateRelocationTaskRequest,
  ): Promise<RelocationTaskResponse> {
    return this.unwrap(
      reloviaApi.updateRelocationTask({
        client: this.client,
        path: { relocationId, taskId },
        body,
        throwOnError: true,
      }),
      'The task could not be saved.',
    );
  }

  createTask(
    relocationId: string,
    body: CreateRelocationTaskRequest,
  ): Promise<RelocationTaskResponse> {
    return this.unwrap(
      reloviaApi.createRelocationTask({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The task could not be saved.',
    );
  }

  async deleteTask(relocationId: string, taskId: string): Promise<void> {
    try {
      await reloviaApi.deleteRelocationTask({
        client: this.client,
        path: { relocationId, taskId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The task could not be deleted.');
    }
  }

  private async unwrap<T>(request: Promise<{ data: T }>, fallback: string): Promise<T> {
    try {
      const result = await request;
      if (result.data === undefined || result.data === null) {
        throw new ApiError(fallback);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw toApiError(error, fallback);
    }
  }
}

function toApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return new ApiError(fallback);
  }

  const problem = error as { title?: unknown; status?: unknown; errors?: unknown };
  const title = typeof problem.title === 'string' && problem.title ? problem.title : fallback;
  const status = typeof problem.status === 'number' ? problem.status : 0;
  const fields: Record<string, string> = {};
  if (problem.errors && typeof problem.errors === 'object') {
    for (const [key, messages] of Object.entries(problem.errors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        fields[key] = messages[0];
      }
    }
  }

  return new ApiError(title, status, fields);
}
