import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalEscalationService } from '../approval-escalation.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-escalation-center',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
    MatDialogModule, LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="escalation-container" dir="rtl">
      <div class="header">
        <div class="title-section">
          <h1>مركز التصعيد</h1>
          <p>متابعة التصعيدات النشطة وطلبات الاعتماد المتجاوزة لمهلة اتفاقية مستوى الخدمة</p>
        </div>
        <button mat-flat-button color="primary" (click)="load()"><mat-icon>refresh</mat-icon> تحديث</button>
      </div>

      <app-loading-spinner [isLoading]="escalationService.loading()"></app-loading-spinner>

      <mat-tab-group>
        <mat-tab label="التصعيدات النشطة ({{ escalationService.escalations().length }})">
          <mat-card class="table-card" *ngIf="escalationService.escalations().length > 0">
            <table mat-table [dataSource]="escalationService.escalations()" class="w-full">
              <ng-container matColumnDef="request">
                <th mat-header-cell *matHeaderCellDef>الطلب</th>
                <td mat-cell *matCellDef="let row">
                  <a class="link" (click)="openRequest(row.request)">{{ row.request }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="escalated_to_id">
                <th mat-header-cell *matHeaderCellDef>مُصعَّد إلى</th>
                <td mat-cell *matCellDef="let row">{{ row.escalated_to_id }}</td>
              </ng-container>
              <ng-container matColumnDef="level">
                <th mat-header-cell *matHeaderCellDef>المستوى</th>
                <td mat-cell *matCellDef="let row">{{ row.escalation_level }}</td>
              </ng-container>
              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>السبب</th>
                <td mat-cell *matCellDef="let row">{{ row.reason }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button color="primary" (click)="resolve(row.id)" title="حل التصعيد">
                    <mat-icon>task_alt</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>
          </mat-card>
          <app-empty-state
            *ngIf="!escalationService.loading() && escalationService.escalations().length === 0"
            icon="trending_up" title="لا توجد تصعيدات نشطة" description="جميع طلبات الاعتماد ضمن المسار الطبيعي."
          ></app-empty-state>
        </mat-tab>

        <mat-tab label="متجاوزة المهلة ({{ escalationService.overdueRequests().length }})">
          <mat-card class="table-card" *ngIf="escalationService.overdueRequests().length > 0">
            <table mat-table [dataSource]="escalationService.overdueRequests()" class="w-full">
              <ng-container matColumnDef="request">
                <th mat-header-cell *matHeaderCellDef>الطلب</th>
                <td mat-cell *matCellDef="let row">
                  <a class="link" (click)="openRequest(row.request)">{{ row.request }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="due_at">
                <th mat-header-cell *matHeaderCellDef>الموعد النهائي</th>
                <td mat-cell *matCellDef="let row">{{ row.due_at | date:'medium' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['request', 'due_at']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['request', 'due_at'];"></tr>
            </table>
          </mat-card>
          <app-empty-state
            *ngIf="!escalationService.loading() && escalationService.overdueRequests().length === 0"
            icon="schedule" title="لا توجد طلبات متجاوزة للمهلة" description="جميع الطلبات ضمن المهلة المحددة."
          ></app-empty-state>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .escalation-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;
    }
    .header h1 { margin: 0; font-size: 1.75rem; color: #0f172a; font-weight: 700; }
    .header p { margin: 0.35rem 0 0; color: #64748b; }
    .table-card { border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-top: 1rem; }
    .w-full { width: 100%; }
    .link { color: #6366f1; cursor: pointer; text-decoration: underline; }
  `]
})
export class EscalationCenterComponent implements OnInit {
  escalationService = inject(ApprovalEscalationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  columns = ['request', 'escalated_to_id', 'level', 'reason', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.escalationService.getActiveEscalations().subscribe();
    this.escalationService.getOverdueRequests().subscribe();
  }

  openRequest(requestId: string) {
    this.router.navigate(['/approvals/requests', requestId]);
  }

  resolve(id: string) {
    const data: ConfirmDialogData = { title: 'حل التصعيد', message: 'هل تم التعامل مع هذا التصعيد؟', color: 'primary' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) this.escalationService.resolveEscalation(id).subscribe(() => this.load());
    });
  }
}
