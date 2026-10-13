import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, of, retry, tap } from 'rxjs';
import { API_URL } from '../config';
import {
  NewServiceRequest,
  RequestStatus,
  ServiceRequest,
  canTransition,
} from '../models/service-request.model';

/**
 * Single source of truth for service requests.
 * Components subscribe to the streams (async pipe); every write goes to the REST API
 * and then updates the in-memory store so all views stay in sync without refetching.
 */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/requests`;

  private readonly store = new BehaviorSubject<ServiceRequest[]>([]);
  private readonly loadingState = new BehaviorSubject<boolean>(false);
  private readonly errorState = new BehaviorSubject<string | null>(null);

  readonly requests$ = this.store.asObservable();
  readonly loading$ = this.loadingState.asObservable();
  readonly error$ = this.errorState.asObservable();

  /** Fetch everything from the API (retries twice on failure) and publish it. */
  load(): void {
    this.loadingState.next(true);
    this.errorState.next(null);
    this.http
      .get<ServiceRequest[]>(this.url)
      .pipe(
        retry({ count: 2, delay: 400 }),
        finalize(() => this.loadingState.next(false)),
      )
      .subscribe({
        next: (list) => this.store.next(list),
        error: (e: Error) => this.errorState.next(e.message),
      });
  }

  /** Look in the store first so navigating list -> detail needs no extra call. */
  getById(id: number): Observable<ServiceRequest> {
    const cached = this.store.value.find((r) => r.id === id);
    return cached ? of(cached) : this.http.get<ServiceRequest>(`${this.url}/${id}`);
  }

  create(input: NewServiceRequest): Observable<ServiceRequest> {
    const now = new Date().toISOString();
    const body: Omit<ServiceRequest, 'id'> = {
      ...input,
      status: 'New',
      assignee: null,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, from: null, to: 'New', note: 'Request submitted' }],
    };
    return this.http.post<ServiceRequest>(this.url, body).pipe(
      tap((created) => this.store.next([created, ...this.store.value])),
    );
  }

  update(id: number, patch: Partial<NewServiceRequest> & { assignee?: string | null }): Observable<ServiceRequest> {
    return this.http
      .patch<ServiceRequest>(`${this.url}/${id}`, { ...patch, updatedAt: new Date().toISOString() })
      .pipe(tap((updated) => this.replace(updated)));
  }

  /** Enforces the workflow rules, records the change in the history, and saves it. */
  changeStatus(request: ServiceRequest, to: RequestStatus, note?: string): Observable<ServiceRequest> {
    if (!canTransition(request.status, to)) {
      throw new Error(`Cannot move a request from "${request.status}" to "${to}".`);
    }
    const now = new Date().toISOString();
    const history = [...request.history, { at: now, from: request.status, to, note: note?.trim() || undefined }];
    return this.http
      .patch<ServiceRequest>(`${this.url}/${request.id}`, { status: to, history, updatedAt: now })
      .pipe(tap((updated) => this.replace(updated)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this.store.next(this.store.value.filter((r) => r.id !== id))),
      map(() => undefined),
    );
  }

  private replace(updated: ServiceRequest): void {
    this.store.next(this.store.value.map((r) => (r.id === updated.id ? updated : r)));
  }
}
