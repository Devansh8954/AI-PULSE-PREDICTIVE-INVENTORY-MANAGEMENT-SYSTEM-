import { Component, Input } from '@angular/core';

/**
 * LoadingRowComponent
 * -------------------
 * A reusable inline loading indicator used inside panel sections.
 * Replaces the repeated "mat-spinner + span" pattern found in every dashboard.
 *
 * Usage:
 *   <app-loading-row *ngIf="isLoading" message="Loading purchase orders…"></app-loading-row>
 */
@Component({
    selector: 'app-loading-row',
    template: `
    <div class="loading-row">
      <mat-spinner diameter="28"></mat-spinner>
      <span>{{ message }}</span>
    </div>
  `,
    styles: [`
    .loading-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 22px;
      color: #8b949e;
      font-size: 13px;
    }
  `],
    standalone: false
})
export class LoadingRowComponent {
  /** Text shown next to the spinner. */
  @Input() message = 'Loading…';
}
