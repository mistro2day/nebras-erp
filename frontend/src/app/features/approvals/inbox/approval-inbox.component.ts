import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ApprovalCoreService, InboxItem } from '../approval-core.service';
import { PriorityBadgeComponent } from '../shared/priority-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatListModule,
    MatDividerModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule,
    MatCheckboxModule, PriorityBadgeComponent, EmptyStateComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="inbox-container" dir="rtl">
      <div class="inbox-header">
        <div class="title-section">
          <h1>صندوق الوارد المؤسسي الموحد</h1>
          <p>جميع طلبات الموافقة والمهام المعلقة الموجهة إليك في مكان واحد</p>
        </div>
        <button mat-flat-button color="primary" (click)="load()">
          <mat-icon>refresh</mat-icon> تحديث
        </button>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>بحث في صندوق الوارد</mat-label>
          <input matInput [(ngModel)]="searchTerm" placeholder="ابحث بالعنوان...">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>الأولوية</mat-label>
          <mat-select [(ngModel)]="priorityFilter">
            <mat-option [value]="null">الكل</mat-option>
            <mat-option value="URGENT">عاجل</mat-option>
            <mat-option value="HIGH">مرتفعة</mat-option>
            <mat-option value="MEDIUM">متوسطة</mat-option>
            <mat-option value="LOW">منخفضة</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button color="warn" [disabled]="selectedIds().length === 0" (click)="bulkArchiveSelected()">
          <mat-icon>archive</mat-icon> أرشفة المحدد ({{ selectedIds().length }})
        </button>
      </div>

      <app-loading-spinner [isLoading]="coreService.loading()"></app-loading-spinner>

      <div class="inbox-grid" *ngIf="!coreService.loading()">
        <mat-card class="inbox-item" *ngFor="let item of filteredItems()" [class.starred]="item.is_starred">
          <div class="item-select">
            <mat-checkbox [checked]="selectedIds().includes(item.id)" (change)="toggleSelect(item.id)"></mat-checkbox>
          </div>
          <div class="item-body" (click)="openRequest(item)">
            <div class="item-header">
              <span class="item-title">{{ item.title_ar || item.title_en }}</span>
              <app-priority-badge [code]="item.priority_code"></app-priority-badge>
            </div>
            <span class="item-meta">النوع: {{ item.item_type }} — الحالة: {{ item.status }}</span>
          </div>
          <div class="item-actions">
            <button mat-icon-button [color]="item.is_starred ? 'accent' : ''" (click)="toggleStar(item)" title="تمييز بنجمة">
              <mat-icon>{{ item.is_starred ? 'star' : 'star_border' }}</mat-icon>
            </button>
            <button mat-icon-button color="primary" (click)="quickApprove(item)" title="اعتماد سريع">
              <mat-icon>check_circle</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="quickReject(item)" title="رفض سريع">
              <mat-icon>cancel</mat-icon>
            </button>
            <button mat-icon-button (click)="archive(item)" title="أرشفة">
              <mat-icon>archive</mat-icon>
            </button>
          </div>
        </mat-card>

        <app-empty-state
          *ngIf="filteredItems().length === 0"
          icon="inbox"
          title="لا توجد عناصر معلّقة"
          description="صندوق الوارد الخاص بك فارغ حالياً."
        ></app-empty-state>
      </div>
    </div>
  `,
  styles: [`
    .inbox-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .inbox-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;
    }
    .inbox-header h1 { margin: 0; font-size: 1.75rem; color: #0f172a; font-weight: 700; }
    .inbox-header p { margin: 0.35rem 0 0; color: #64748b; }
    .filter-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 240px; }
    .filter-field { width: 200px; }
    .inbox-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .inbox-item {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
      border-radius: 10px; border: 1px solid #e2e8f0; cursor: default;
    }
    .inbox-item.starred { border-color: #f59e0b; }
    .item-body { flex: 1; cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem; }
    .item-header { display: flex; align-items: center; gap: 0.75rem; }
    .item-title { font-weight: 700; color: #0f172a; }
    .item-meta { font-size: 0.8rem; color: #64748b; }
    .item-actions { display: flex; align-items: center; }
  `]
})
export class ApprovalInboxComponent implements OnInit {
  coreService = inject(ApprovalCoreService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  searchTerm = '';
  priorityFilter: string | null = null;
  selectedIds = signal<string[]>([]);

  filteredItems = computed(() => {
    let items = this.coreService.inboxItems();
    if (this.priorityFilter) {
      items = items.filter((i) => i.priority_code === this.priorityFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      items = items.filter((i) => (i.title_ar || i.title_en || '').toLowerCase().includes(term));
    }
    return items;
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.coreService.getMyInboxItems().subscribe();
  }

  toggleSelect(id: string) {
    const current = this.selectedIds();
    this.selectedIds.set(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  openRequest(item: InboxItem) {
    this.router.navigate(['/approvals/requests', item.item_id]);
  }

  toggleStar(item: InboxItem) {
    this.coreService.toggleStar(item.id).subscribe(() => this.load());
  }

  archive(item: InboxItem) {
    this.coreService.archiveItem(item.id).subscribe(() => this.load());
  }

  bulkArchiveSelected() {
    this.coreService.bulkArchive(this.selectedIds()).subscribe(() => {
      this.selectedIds.set([]);
      this.load();
    });
  }

  quickApprove(item: InboxItem) {
    this.confirmAndDecide(item, 'approve', 'اعتماد الطلب', 'هل أنت متأكد من اعتماد هذا الطلب؟', 'primary');
  }

  quickReject(item: InboxItem) {
    this.confirmAndDecide(item, 'reject', 'رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', 'warn');
  }

  private confirmAndDecide(item: InboxItem, action: 'approve' | 'reject', title: string, message: string, color: 'primary' | 'warn') {
    const data: ConfirmDialogData = { title, message, color };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.coreService.makeDecision(item.item_id, action).subscribe(() => this.load());
      }
    });
  }
}
