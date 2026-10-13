import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { RequestStatus, STATUS_TRANSITIONS, ServiceRequest } from '../../models/service-request.model';
import { RequestService } from '../../services/request.service';
import { Badge } from '../../shared/badge';
import { ErrorBanner } from '../../shared/error-banner';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

@Component({
  selector: 'app-request-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, Badge, ErrorBanner, TimeAgoPipe],
  template: `
    <app-error-banner [message]="error()" />

    @if (request(); as r) {
      <header class="page-head">
        <div>
          <p class="muted">Request #{{ r.id }} · {{ r.category }}</p>
          <h1>{{ r.title }}</h1>
          <div class="card-meta">
            <app-badge [label]="r.status" kind="status" />
            <app-badge [label]="r.priority" kind="priority" />
            <span class="muted">Updated {{ r.updatedAt | timeAgo }}</span>
          </div>
        </div>
        <div class="head-actions">
          <a class="btn" routerLink="/requests">← Back</a>
          <a class="btn" [routerLink]="['/requests', r.id, 'edit']">Edit</a>
        </div>
      </header>

      <div class="detail-grid">
        <section class="panel">
          <h2>Details</h2>
          <p class="pre">{{ r.description }}</p>
          <dl class="facts">
            <div><dt>Requester</dt><dd>{{ r.requester }} ({{ r.requesterEmail }})</dd></div>
            <div><dt>Assignee</dt><dd>{{ r.assignee ?? 'Unassigned' }}</dd></div>
            <div><dt>Created</dt><dd>{{ r.createdAt | date: 'medium' }}</dd></div>
          </dl>
        </section>

        <section class="panel">
          <h2>Workflow</h2>
          @if (nextSteps(r).length) {
            <label class="field">
              <span>Note (optional)</span>
              <input type="text" [formControl]="note" placeholder="Add context for this change" />
            </label>
            <div class="actions wrap">
              @for (s of nextSteps(r); track s) {
                <button type="button" class="btn" (click)="move(r, s)" [disabled]="busy()">
                  Move to {{ s }}
                </button>
              }
            </div>
          } @else {
            <p class="muted">This request is closed. No further changes are possible.</p>
          }

          <h3>History</h3>
          <ol class="timeline">
            @for (h of r.history.slice().reverse(); track h.at) {
              <li>
                <strong>{{ h.from ? h.from + ' → ' : '' }}{{ h.to }}</strong>
                <span class="muted">{{ h.at | date: 'medium' }}</span>
                @if (h.note) { <em>{{ h.note }}</em> }
              </li>
            }
          </ol>
        </section>
      </div>
    }
  `,
})
export class RequestDetail {
  private readonly svc = inject(RequestService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly note = new FormControl('', { nonNullable: true });
  private readonly override = signal<ServiceRequest | null>(null);

  private readonly loaded = toSignal(
    this.route.paramMap.pipe(
      map((p) => Number(p.get('id'))),
      switchMap((id) =>
        this.svc.getById(id).pipe(
          catchError((e: Error) => {
            this.error.set(e.message);
            return of(null);
          }),
        ),
      ),
    ),
    { initialValue: null },
  );

  /** Latest saved version wins over the one first loaded. */
  protected readonly request = () => this.override() ?? this.loaded();

  protected nextSteps(r: ServiceRequest): readonly RequestStatus[] {
    return STATUS_TRANSITIONS[r.status];
  }

  protected move(r: ServiceRequest, to: RequestStatus): void {
    this.busy.set(true);
    this.error.set(null);
    this.svc.changeStatus(r, to, this.note.value).subscribe({
      next: (updated) => {
        this.override.set(updated);
        this.note.reset('');
        this.busy.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.busy.set(false);
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/requests']);
  }
}
