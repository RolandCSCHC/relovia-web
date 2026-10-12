import { apiOrigin } from '../core/api-origin';
import type { CreateClientConfig } from './generated/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: apiOrigin,
});
