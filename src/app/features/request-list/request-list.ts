import { AsyncPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, debounceTime, map, startWith } from 'rxjs';
import {
  CATEGORIES,
  DEFAULT_FILTERS,
  PRIORITIES,
  RequestFilters,
  STATUSES,
  applyFilters,
} from '../../models/service-request.model';
import { RequestService } from '../../services/request.service';
import { Badge } from '../../shared/badge';
import { ErrorBanner } from '../../shared/error-banner';
import { TimeAgoPipe } from '../../shared/time-ago.pipe';

@Component({
  selector: 'app-request-list',
  imports: [AsyncPipe, ReactiveFormsModule, RouterLink, Badge, ErrorBanner, TimeAgoPipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Service requests</h1>
        <p class="muted">Track every request from submission to resolution.</p>
      </div>
      <a class="btn primary" routerLink="/requests/new">+ New request</a>
    </header>

    <app-error-banner [message]="error$ | async" [retryable]="true" (retry)="svc.load()" />

    @if (vm$ | async; as vm) {
      <section class="stats" aria-label="Requests by status">
        @for (s of statuses; track s) {
          <button
            type="button"
            class="stat"
            [class.active]="form.controls.status.value === s"
            (click)="toggleStatus(s)"
          >
            <strong>{{ vm.counts[s] }}</strong>
            <span>{{ s }}</span>
          </button>
        }
      </section>

      <form class="filters" [formGroup]="form" (ngSubmit)="$event.preventDefault()">
        <input
          type="search"
          formControlName="search"
          placeholder="Search title, description, requester or ID"
          aria-label="Search requests"
        />
        <select formControlName="status" aria-label="Filter by status">
          <option value="All">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
        <select formControlName="priority" aria-label="Filter by priority">
          <option value="All">All priorities</option>
          @for (p of priorities; track p) {
            <option [value]="p">{{ p }}</option>
          }
        </select>
        <select formControlName="category" aria-label="Filter by category">
          <option value="All">All categories</option>
          @for (c of categories; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
        <select formControlName="sort" aria-label="Sort requests">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">Highest priority</option>
        </select>
        <button type="button" class="btn" (click)="reset()">Reset</button>
      </form>

      @if (loading$ | async) {
        <p class="muted center">Loading requests…</p>
      } @else if (vm.items.length === 0) {
        <div class="empty">
          <h2>No requests match</h2>
          <p class="muted">Try clearing a filter or create a new request.</p>
        </div>
      } @else {
        <p class="muted result-count">Showing {{ vm.items.length }} of {{ vm.total }}</p>
        <ul class="cards">
          @for (r of vm.items; track r.id) {
            <li class="card">
              <a [routerLink]="['/requests', r.id]" class="card-link">
                <div class="card-top">
                  <span class="id">#{{ r.id }}</span>
                  <app-badge [label]="r.status" kind="status" />
                </div>
                <h3>{{ r.title }}</h3>
                <p class="clamp">{{ r.description }}</p>
                <div class="card-meta">
                  <app-badge [label]="r.priority" kind="priority" />
                  <span class="chip">{{ r.category }}</span>
                  <span class="muted">{{ r.requester }} · {{ r.updatedAt | timeAgo }}</span>
                </div>
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class RequestList implements OnInit {
  protected readonly svc = inject(RequestService);
  private readonly fb = inject(FormBuilder);

  protected readonly statuses = STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly categories = CATEGORIES;
  protected readonly error$ = this.svc.error$;
  protected readonly loading$ = this.svc.loading$;

  protected readonly form = this.fb.nonNullable.group({ ...DEFAULT_FILTERS });

  /** Requests + filter form -> one view model. Search is debounced so typing stays smooth. */
  protected readonly vm$ = combineLatest([
    this.svc.requests$,
    this.form.valueChanges.pipe(
      debounceTime(150),
      startWith(this.form.getRawValue()),
      map(() => this.form.getRawValue() as RequestFilters),
    ),
  ]).pipe(
    map(([all, filters]) => ({
      items: applyFilters(all, filters),
      total: all.length,
      counts: Object.fromEntries(
        STATUSES.map((s) => [s, all.filter((r) => r.status === s).length]),
      ) as Record<(typeof STATUSES)[number], number>,
    })),
  );

  ngOnInit(): void {
    this.svc.load();
  }

  protected toggleStatus(status: (typeof STATUSES)[number]): void {
    const current = this.form.controls.status.value;
    this.form.controls.status.setValue(current === status ? 'All' : status);
  }

  protected reset(): void {
    this.form.reset({ ...DEFAULT_FILTERS });
  }
}
