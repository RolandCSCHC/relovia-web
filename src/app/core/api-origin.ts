export const apiOrigin = 'http://localhost:5080';

export const googleSignInUrl = `${apiOrigin}/api/auth/google`;

export function isApiRequest(url: string): boolean {
  return url === apiOrigin || url.startsWith(`${apiOrigin}/`);
}
