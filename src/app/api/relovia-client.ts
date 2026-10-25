import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiOrigin } from '../core/api-origin';
import { createClient } from './generated/client';
import * as reloviaApi from './generated/sdk.gen';
import type {
  BudgetCategoryResponse,
  BudgetEstimateResponse,
  BudgetResponse,
  CalendarEventResponse,
  ChecklistSuggestionResponse,
  NotificationPreferenceResponse,
  NotificationResponse,
  ConfirmChecklistRequest,
  ConfirmInventoryListRequest,
  CreateRelocationTaskRequest,
  DocumentResponse,
  ExpenseResponse,
  Furnishing,
  InventoryItemResponse,
  InventorySuggestionResponse,
  ItemRoom,
  RelocationCalendarResponse,
  RelocationResponse,
  RelocationTaskResponse,
  RelocationTasksResponse,
  SaveBudgetCategoryRequest,
  SaveCalendarEventRequest,
  SaveBudgetEstimateRequest,
  SaveBudgetRequest,
  SaveExpenseRequest,
  SaveInventoryItemRequest,
  SaveNotificationPreferenceRequest,
  SaveRelocationRequest,
  UpdateDocumentRequest,
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
  private readonly http = inject(HttpClient);
  private readonly client = createClient(createClientConfig({ httpClient: this.http }));

  async listCities(country: string): Promise<string[]> {
    const result = await this.unwrap(
      reloviaApi.listCities({
        client: this.client,
        query: { country },
        throwOnError: true,
      }),
      'Cities could not be loaded.',
    );
    return result.cities;
  }

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

  listDocuments(relocationId: string): Promise<DocumentResponse[]> {
    return this.unwrap(
      reloviaApi.listDocuments({
        client: this.client,
        path: { relocationId },
        throwOnError: true,
      }),
      'Documents could not be loaded.',
    );
  }

  createDocument(relocationId: string, file: File): Promise<DocumentResponse> {
    return this.unwrap(
      reloviaApi.createDocument({
        client: this.client,
        path: { relocationId },
        body: { File: file },
        throwOnError: true,
      }),
      'The file could not be uploaded.',
    );
  }

  updateDocument(
    relocationId: string,
    documentId: string,
    body: UpdateDocumentRequest,
  ): Promise<DocumentResponse> {
    return this.unwrap(
      reloviaApi.updateDocument({
        client: this.client,
        path: { relocationId, documentId },
        body,
        throwOnError: true,
      }),
      'The document could not be saved.',
    );
  }

  async deleteDocument(relocationId: string, documentId: string): Promise<void> {
    try {
      await reloviaApi.deleteDocument({
        client: this.client,
        path: { relocationId, documentId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The document could not be deleted.');
    }
  }

  async downloadDocument(relocationId: string, documentId: string): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.get(
          `${apiOrigin}/api/relocations/${relocationId}/documents/${documentId}/content`,
          { responseType: 'blob' },
        ),
      );
    } catch (error) {
      throw toApiError(error, 'The file could not be downloaded.');
    }
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

  getBudget(relocationId: string): Promise<BudgetResponse> {
    return this.unwrap(
      reloviaApi.getBudget({ client: this.client, path: { relocationId }, throwOnError: true }),
      'The budget could not be loaded.',
    );
  }

  saveBudget(relocationId: string, body: SaveBudgetRequest): Promise<BudgetResponse> {
    return this.unwrap(
      reloviaApi.saveBudget({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The budget could not be saved.',
    );
  }

  createBudgetCategory(
    relocationId: string,
    body: SaveBudgetCategoryRequest,
  ): Promise<BudgetCategoryResponse> {
    return this.unwrap(
      reloviaApi.createBudgetCategory({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The category could not be saved.',
    );
  }

  updateBudgetCategory(
    relocationId: string,
    categoryId: string,
    body: SaveBudgetCategoryRequest,
  ): Promise<BudgetCategoryResponse> {
    return this.unwrap(
      reloviaApi.updateBudgetCategory({
        client: this.client,
        path: { relocationId, categoryId },
        body,
        throwOnError: true,
      }),
      'The category could not be saved.',
    );
  }

  async deleteBudgetCategory(relocationId: string, categoryId: string): Promise<void> {
    try {
      await reloviaApi.deleteBudgetCategory({
        client: this.client,
        path: { relocationId, categoryId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The category could not be deleted.');
    }
  }

  createBudgetEstimate(
    relocationId: string,
    body: SaveBudgetEstimateRequest,
  ): Promise<BudgetEstimateResponse> {
    return this.unwrap(
      reloviaApi.createBudgetEstimate({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The estimate could not be saved.',
    );
  }

  updateBudgetEstimate(
    relocationId: string,
    estimateId: string,
    body: SaveBudgetEstimateRequest,
  ): Promise<BudgetEstimateResponse> {
    return this.unwrap(
      reloviaApi.updateBudgetEstimate({
        client: this.client,
        path: { relocationId, estimateId },
        body,
        throwOnError: true,
      }),
      'The estimate could not be saved.',
    );
  }

  async deleteBudgetEstimate(relocationId: string, estimateId: string): Promise<void> {
    try {
      await reloviaApi.deleteBudgetEstimate({
        client: this.client,
        path: { relocationId, estimateId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The estimate could not be deleted.');
    }
  }

  listExpenses(relocationId: string): Promise<ExpenseResponse[]> {
    return this.unwrap(
      reloviaApi.listExpenses({ client: this.client, path: { relocationId }, throwOnError: true }),
      'Expenses could not be loaded.',
    );
  }

  createExpense(relocationId: string, body: SaveExpenseRequest): Promise<ExpenseResponse> {
    return this.unwrap(
      reloviaApi.createExpense({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The expense could not be saved.',
    );
  }

  updateExpense(
    relocationId: string,
    expenseId: string,
    body: SaveExpenseRequest,
  ): Promise<ExpenseResponse> {
    return this.unwrap(
      reloviaApi.updateExpense({
        client: this.client,
        path: { relocationId, expenseId },
        body,
        throwOnError: true,
      }),
      'The expense could not be saved.',
    );
  }

  getInventorySuggestion(
    relocationId: string,
    furnishing: Furnishing,
    room: ItemRoom | null,
  ): Promise<InventorySuggestionResponse> {
    return this.unwrap(
      reloviaApi.getInventorySuggestion({
        client: this.client,
        path: { relocationId },
        query: room ? { furnishing, room } : { furnishing },
        throwOnError: true,
      }),
      'The list could not be loaded.',
    );
  }

  confirmInventoryList(
    relocationId: string,
    body: ConfirmInventoryListRequest,
  ): Promise<InventoryItemResponse[]> {
    return this.unwrap(
      reloviaApi.confirmInventoryList({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The list could not be added.',
    );
  }

  listInventoryItems(relocationId: string): Promise<InventoryItemResponse[]> {
    return this.unwrap(
      reloviaApi.listInventoryItems({
        client: this.client,
        path: { relocationId },
        throwOnError: true,
      }),
      'Inventory could not be loaded.',
    );
  }

  createInventoryItem(
    relocationId: string,
    body: SaveInventoryItemRequest,
  ): Promise<InventoryItemResponse> {
    return this.unwrap(
      reloviaApi.createInventoryItem({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The item could not be saved.',
    );
  }

  updateInventoryItem(
    relocationId: string,
    itemId: string,
    body: SaveInventoryItemRequest,
  ): Promise<InventoryItemResponse> {
    return this.unwrap(
      reloviaApi.updateInventoryItem({
        client: this.client,
        path: { relocationId, itemId },
        body,
        throwOnError: true,
      }),
      'The item could not be saved.',
    );
  }

  getCalendar(relocationId: string): Promise<RelocationCalendarResponse> {
    return this.unwrap(
      reloviaApi.getRelocationCalendar({
        client: this.client,
        path: { relocationId },
        throwOnError: true,
      }),
      'The calendar could not be loaded.',
    );
  }

  createCalendarEvent(
    relocationId: string,
    body: SaveCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return this.unwrap(
      reloviaApi.createCalendarEvent({
        client: this.client,
        path: { relocationId },
        body,
        throwOnError: true,
      }),
      'The event could not be saved.',
    );
  }

  updateCalendarEvent(
    relocationId: string,
    eventId: string,
    body: SaveCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return this.unwrap(
      reloviaApi.updateCalendarEvent({
        client: this.client,
        path: { relocationId, eventId },
        body,
        throwOnError: true,
      }),
      'The event could not be saved.',
    );
  }

  listNotifications(): Promise<NotificationResponse[]> {
    return this.unwrap(
      reloviaApi.listNotifications({ client: this.client, throwOnError: true }),
      'Reminders could not be loaded.',
    );
  }

  markNotificationRead(notificationId: string): Promise<NotificationResponse> {
    return this.unwrap(
      reloviaApi.markNotificationRead({
        client: this.client,
        path: { notificationId },
        throwOnError: true,
      }),
      'The reminder could not be marked read.',
    );
  }

  async markNotificationsRead(): Promise<void> {
    try {
      await reloviaApi.markNotificationsRead({ client: this.client, throwOnError: true });
    } catch (error) {
      throw toApiError(error, 'The reminders could not be marked read.');
    }
  }

  getNotificationPreference(): Promise<NotificationPreferenceResponse> {
    return this.unwrap(
      reloviaApi.getNotificationPreference({ client: this.client, throwOnError: true }),
      'Reminder settings could not be loaded.',
    );
  }

  updateNotificationPreference(
    body: SaveNotificationPreferenceRequest,
  ): Promise<NotificationPreferenceResponse> {
    return this.unwrap(
      reloviaApi.updateNotificationPreference({
        client: this.client,
        body,
        throwOnError: true,
      }),
      'Reminder settings could not be saved.',
    );
  }

  async deleteCalendarEvent(relocationId: string, eventId: string): Promise<void> {
    try {
      await reloviaApi.deleteCalendarEvent({
        client: this.client,
        path: { relocationId, eventId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The event could not be deleted.');
    }
  }

  async deleteInventoryItem(relocationId: string, itemId: string): Promise<void> {
    try {
      await reloviaApi.deleteInventoryItem({
        client: this.client,
        path: { relocationId, itemId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The item could not be deleted.');
    }
  }

  async deleteExpense(relocationId: string, expenseId: string): Promise<void> {
    try {
      await reloviaApi.deleteExpense({
        client: this.client,
        path: { relocationId, expenseId },
        throwOnError: true,
      });
    } catch (error) {
      throw toApiError(error, 'The expense could not be deleted.');
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
