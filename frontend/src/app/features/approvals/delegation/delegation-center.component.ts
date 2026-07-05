import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalDelegationService } from '../approval-delegation.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DelegationDialogComponent, DelegationDialogResult } from '../request-detail/delegation-dialog.component';

@Component({
  selector: 'app-delegation-center',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="delegation-container" dir="rtl">
      <div class="header">
        <div class="title-section">
          <h1>مركز التفويض</h1>
          <p>إدارة تفويضات الاعتماد الصادرة منك أو الموجهة إليك</p>
        </div>
        <button mat-flat-button color="primary" (click)="createDelegation()">
          <mat-icon>add</mat-icon> تفويض جديد
        </button>
      </div>

      <app-loading-spinner [isLoading]="delegationService.loading()"></app-loading-spinner>

      <mat-card class="table-card" *ngIf="delegationService.delegations().length > 0">
        <table mat-table [dataSource]="delegationService.delegations()" class="w-full">
          <ng-container matColumnDef="delegate_to_id">
            <th mat-header-cell *matHeaderCellDef>مفوَّض إلى</th>
            <td mat-cell *matCellDef="let row">{{ row.delegate_to_id }}</td>
          </ng-container>
          <ng-container matColumnDef="start_date">
            <th mat-header-cell *matHeaderCellDef>البداية</th>
            <td mat-cell *matCellDef="let row">{{ row.start_date | date:'short' }}</td>
          </ng-container>
          <ng-container matColumnDef="end_date">
            <th mat-header-cell *matHeaderCellDef>النهاية</th>
            <td mat-cell *matCellDef="let row">{{ row.end_date | date:'short' }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>الحالة</th>
            <td mat-cell *matCellDef="let row">
              <span class="badge" [ngClass]="row.is_active ? 'badge-success' : 'badge-muted'">
                {{ row.is_active ? 'نشط' : 'غير نشط' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="warn" *ngIf="row.is_active" (click)="deactivate(row.id)" title="إلغاء التفويض">
                <mat-icon>block</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      </mat-card>

      <app-empty-state
        *ngIf="!delegationService.loading() && delegationService.delegations().length === 0"
        icon="forward"
        title="لا توجد تفويضات"
        description="لم تقم بإنشاء أي تفويض اعتماد بعد."
      ></app-empty-state>
    </div>
  `,
  styles: [`
    .delegation-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;
    }
    .header h1 { margin: 0; font-size: 1.75rem; color: #0f172a; font-weight: 700; }
    .header p { margin: 0.35rem 0 0; color: #64748b; }
    .table-card { border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .w-full { width: 100%; }
    .badge { padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-muted { background: #f1f5f9; color: #64748b; }
  `]
})
export class DelegationCenterComponent implements OnInit {
  delegationService = inject(ApprovalDelegationService);
  private dialog = inject(MatDialog);

  columns = ['delegate_to_id', 'start_date', 'end_date', 'status', 'actions'];

  ngOnInit() { this.load(); }
  load() { this.delegationService.getMyDelegations().subscribe(); }

  createDelegation() {
    this.dialog.open(DelegationDialogComponent).afterClosed().subscribe((result: DelegationDialogResult | undefined) => {
      if (result) {
        this.delegationService.createDelegation({
          delegate_to_id: result.delegate_to_id, start_date: result.start_date,
          end_date: result.end_date, reason: result.reason,
        }).subscribe(() => this.load());
      }
    });
  }

  deactivate(id: string) {
    const data: ConfirmDialogData = { title: 'إلغاء التفويض', message: 'هل تريد إلغاء هذا التفويض؟', color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) this.delegationService.deactivateDelegation(id).subscribe(() => this.load());
    });
  }
}
