import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CATEGORIES, PRIORITIES, NewServiceRequest } from '../../models/service-request.model';
import { RequestService } from '../../services/request.service';
import { ErrorBanner } from '../../shared/error-banner';

@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule, RouterLink, ErrorBanner],
  template: `
    <header class="page-head">
      <div>
        <h1>{{ editId() ? 'Edit request #' + editId() : 'New service request' }}</h1>
        <p class="muted">Describe what you need and we will route it to the right team.</p>
      </div>
      <a class="btn" routerLink="/requests">Cancel</a>
    </header>

    <app-error-banner [message]="error()" />

    <form class="panel form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label class="field">
        <span>Title</span>
        <input type="text" formControlName="title" placeholder="e.g. Laptop will not connect to VPN" />
        @if (showError('title')) {
          <small class="error-text">
            @if (form.controls.title.hasError('required')) { A title is required. }
            @else { Use at least 5 characters. }
          </small>
        }
      </label>

      <label class="field">
        <span>Description</span>
        <textarea rows="5" formControlName="description" placeholder="What happened, and what do you need?"></textarea>
        @if (showError('description')) {
          <small class="error-text">
            @if (form.controls.description.hasError('required')) { A description is required. }
            @else { Please add a little more detail (at least 10 characters). }
          </small>
        }
      </label>

      <div class="row">
        <label class="field">
          <span>Category</span>
          <select formControlName="category">
            @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <label class="field">
          <span>Priority</span>
          <select formControlName="priority">
            @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </label>
      </div>

      <div class="row">
        <label class="field">
          <span>Your name</span>
          <input type="text" formControlName="requester" />
          @if (showError('requester')) { <small class="error-text">Your name is required.</small> }
        </label>
        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="requesterEmail" />
          @if (showError('requesterEmail')) { <small class="error-text">Enter a valid email address.</small> }
        </label>
      </div>

      <div class="actions">
        <button class="btn primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving…' : editId() ? 'Save changes' : 'Submit request' }}
        </button>
      </div>
    </form>
  `,
})
export class RequestForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(RequestService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly categories = CATEGORIES;
  protected readonly priorities = PRIORITIES;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    category: [CATEGORIES[0] as (typeof CATEGORIES)[number], Validators.required],
    priority: ['Medium' as (typeof PRIORITIES)[number], Validators.required],
    requester: ['', Validators.required],
    requesterEmail: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editId.set(id);
      this.svc.getById(id).subscribe({
        next: (r) => this.form.patchValue(r),
        error: (e: Error) => this.error.set(e.message),
      });
    }
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue() as NewServiceRequest;
    const id = this.editId();
    const save$ = id ? this.svc.update(id, value) : this.svc.create(value);
    save$.subscribe({
      next: (saved) => this.router.navigate(['/requests', saved.id]),
      error: (e: Error) => {
        this.error.set(e.message);
        this.saving.set(false);
      },
    });
  }
}
