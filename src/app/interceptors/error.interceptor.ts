import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export function friendlyMessage(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'Cannot reach the API. Start it with "npm run api" and try again.';
  }
  if (err.status === 404) return 'That request could not be found.';
  if (err.status >= 500) return 'The server had a problem. Please try again in a moment.';
  if (err.status >= 400) return 'The server rejected that request. Check your input and try again.';
  return 'Something went wrong. Please try again.';
}

/** Turns low-level HTTP failures into one readable Error so components only show a message. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) =>
      throwError(() =>
        err instanceof HttpErrorResponse ? new Error(friendlyMessage(err)) : new Error('Unexpected error.'),
      ),
    ),
  );
