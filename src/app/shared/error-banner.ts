import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    @if (message()) {
      <div class="banner error" role="alert">
        <span>{{ message() }}</span>
        @if (retryable()) {
          <button type="button" class="btn small" (click)="retry.emit()">Retry</button>
        }
      </div>
    }
  `,
})
export class ErrorBanner {
  readonly message = input<string | null>(null);
  readonly retryable = input(false);
  readonly retry = output<void>();
}
