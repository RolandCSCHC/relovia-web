import { HttpInterceptorFn } from '@angular/common/http';
import { isApiRequest } from './api-origin';

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const token = mutatingMethods.has(request.method) ? readCookie('XSRF-TOKEN') : null;
  return next(
    request.clone({
      withCredentials: true,
      setHeaders: token ? { 'X-XSRF-TOKEN': token } : {},
    }),
  );
};

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return null;
}
