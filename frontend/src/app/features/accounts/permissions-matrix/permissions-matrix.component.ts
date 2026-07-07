import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ApiClientService } from '../../../core/services/api-client.service';
import { FormsModule } from '@angular/forms';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

export interface Role {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
}

export interface MatrixRow {
  permission: Permission;
  role_ids: string[];
}

@Component({
  selector: 'app-permissions-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مصفوفة الصلاحيات التفصيلية (Permission Matrix)"
        subtitle="إدارة الصلاحيات التفصيلية للأدوار المختلفة بشكل ديناميكي كامل."
      ></nb-page-header>

      <nb-panel [flush]="true">
        <div class="table-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="perm-header">الصلاحية / الدور</th>
                @for (role of roles(); track role.id) {
                  <th class="role-header">
                    <div class="role-title">{{ role.name }}</div>
                    <span class="nb-badge-neutral">{{ role.category === 'system' ? 'نظامي' : 'مخصص' }}</span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of matrix(); track row.permission.id) {
                <tr>
                  <td class="perm-cell">
                    <span class="perm-name">{{ row.permission.name }}</span>
                    <span class="perm-code">{{ row.permission.code }}</span>
                  </td>
                  @for (role of roles(); track role.id) {
                    <td class="checkbox-cell">
                      <input
                        type="checkbox"
                        [checked]="isAssigned(row, role.id)"
                        (change)="togglePermission(row, role.id)"
                        [disabled]="role.category === 'system'"
                      />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .table-wrapper { overflow-x: auto; }
    .matrix-table { width: 100%; border-collapse: collapse; text-align: right; }
    .matrix-table th, .matrix-table td { padding: 12px 16px; border-bottom: 1px solid var(--nb-border-row); }
    .matrix-table thead th { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); }
    .perm-header { width: 300px; color: var(--nb-text-secondary); font-weight: 700; font-size: 12px; }
    .role-header { text-align: center; color: var(--nb-text-secondary); }
    .role-title { font-weight: 700; font-size: 13px; color: var(--nb-text); }
    .perm-cell { display: flex; flex-direction: column; }
    .perm-name { color: var(--nb-text); font-weight: 500; font-size: 13px; }
    .perm-code { color: var(--nb-text-muted); font-size: 11px; margin-top: 2px; }
    .checkbox-cell { text-align: center; }
    .checkbox-cell input { width: 16px; height: 16px; accent-color: var(--nb-primary-600); cursor: pointer; }
    .checkbox-cell input:disabled { cursor: not-allowed; opacity: 0.5; }
  `]
})
export class PermissionsMatrixComponent implements OnInit {
  private apiClient = inject(ApiClientService);

  roles = signal<Role[]>([]);
  matrix = signal<MatrixRow[]>([]);

  ngOnInit() {
    this.loadMatrix();
  }

  loadMatrix() {
    this.apiClient.get<any>('identity/permission-matrix/').subscribe(res => {
      if (res.success) {
        this.roles.set(res.data.roles);
        this.matrix.set(res.data.matrix);
      }
    });
  }

  isAssigned(row: MatrixRow, roleId: string): boolean {
    return row.role_ids.includes(roleId);
  }

  togglePermission(row: MatrixRow, roleId: string) {
    let newRoleIds = [...row.role_ids];
    if (newRoleIds.includes(roleId)) {
      newRoleIds = newRoleIds.filter(id => id !== roleId);
    } else {
      newRoleIds.push(roleId);
    }
    
    // حفظ التغيير برمجياً
    const body = {
      role_id: roleId,
      permission_ids: this.matrix()
        .filter(r => (r.permission.id === row.permission.id ? !row.role_ids.includes(roleId) : r.role_ids.includes(roleId)))
        .map(r => r.permission.id)
    };

    this.apiClient.post('identity/permission-matrix/', body).subscribe({
      next: () => {
        row.role_ids = newRoleIds;
      }
    });
  }
}