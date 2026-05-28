import { Pipe, PipeTransform } from '@angular/core';

/**
 * StatusIconPipe
 * --------------
 * Converts a PO / alert status string into its Material icon name.
 * Centralizes icon mapping that was previously copy-pasted into
 * getStatusIcon() methods on Manager and Warehouse dashboard components.
 *
 * Usage: {{ row.status | statusIcon }}
 */
@Pipe({ name: 'statusIcon' })
export class StatusIconPipe implements PipeTransform {
  private static readonly MAP: Record<string, string> = {
    pending:    'schedule',
    PENDING:    'schedule',
    approved:   'thumb_up',
    APPROVED:   'thumb_up',
    dispatched: 'local_shipping',
    DISPATCHED: 'local_shipping',
    received:   'inventory',
    RECEIVED:   'inventory',
    cancelled:  'cancel',
    CANCELLED:  'cancel',
    critical:   'error',
    CRITICAL:   'error',
    low:        'warning_amber',
    LOW:        'warning_amber',
    adequate:   'check_circle',
    ADEQUATE:   'check_circle',
    ok:         'check_circle',
    OK:         'check_circle',
  };

  transform(status: string): string {
    return StatusIconPipe.MAP[status] ?? 'help_outline';
  }
}

/**
 * StatusClassPipe
 * ---------------
 * Converts a PO / alert status string into a CSS badge modifier class.
 * Eliminates the repeated getStatusClass() switch-case in multiple components.
 *
 * Usage: [ngClass]="row.status | statusClass"
 */
@Pipe({ name: 'statusClass' })
export class StatusClassPipe implements PipeTransform {
  private static readonly MAP: Record<string, string> = {
    pending:    'badge--gold',
    PENDING:    'badge--gold',
    approved:   'badge--blue',
    APPROVED:   'badge--blue',
    dispatched: 'badge--purple',
    DISPATCHED: 'badge--purple',
    received:   'badge--green',
    RECEIVED:   'badge--green',
    cancelled:  'badge--red',
    CANCELLED:  'badge--red',
    critical:   'badge--red',
    CRITICAL:   'badge--red',
    low:        'badge--gold',
    LOW:        'badge--gold',
    adequate:   'badge--green',
    ADEQUATE:   'badge--green',
    ok:         'badge--green',
    OK:         'badge--green',
    alert:      'badge--red',
  };

  transform(status: string): string {
    return StatusClassPipe.MAP[status] ?? 'badge--muted';
  }
}
