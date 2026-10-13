import { Component, computed, input } from '@angular/core';

/** One small reusable pill used for both status and priority values. */
@Component({
  selector: 'app-badge',
  template: `<span class="badge" [class]="cls()">{{ label() }}</span>`,
})
export class Badge {
  readonly label = input.required<string>();
  readonly kind = input<'status' | 'priority'>('status');

  protected readonly cls = computed(
    () => `${this.kind()}-${this.label().toLowerCase().replace(/\s+/g, '-')}`,
  );
}
