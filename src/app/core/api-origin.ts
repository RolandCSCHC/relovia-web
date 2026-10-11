import { environment } from '../../environments/environment';

export const apiOrigin = environment.apiOrigin;

export const googleSignInUrl = `${apiOrigin}/api/auth/google`;

export function isApiRequest(url: string): boolean {
  return url === apiOrigin || url.startsWith(`${apiOrigin}/`);
}
