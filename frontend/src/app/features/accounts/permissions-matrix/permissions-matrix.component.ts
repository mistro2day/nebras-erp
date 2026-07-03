import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClientService } from '../../../core/services/api-client.service';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="matrix-container" dir="rtl">
      <div class="page-header">
        <h1>مصفوفة الصلاحيات التفصيلية (Permission Matrix)</h1>
        <p>إدارة الصلاحيات التفصيلية للأدوار المختلفة بشكل ديناميكي كامل.</p>
      </div>

      <div class="matrix-card">
        <div class="table-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="perm-header">الصلاحية / الدور</th>
                <th *ngFor="let role of roles()" class="role-header">
                  <div class="role-title">{{ role.name }}</div>
                  <span class="role-badge">{{ role.category === 'system' ? 'نظامي' : 'مخصص' }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of matrix()">
                <td class="perm-cell">
                  <span class="perm-name">{{ row.permission.name }}</span>
                  <span class="perm-code">{{ row.permission.code }}</span>
                </td>
                <td *ngFor="let role of roles()" class="checkbox-cell">
                  <label class="custom-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="isAssigned(row, role.id)" 
                      (change)="togglePermission(row, role.id)" 
                      [disabled]="role.category === 'system'"
                    />
                    <span class="checkmark"></span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .matrix-container {
      padding: 24px;
    }
    .page-header {
      margin-bottom: 24px;
    }
    .page-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .page-header p {
      color: #9ca3af;
      font-size: 14px;
    }
    .matrix-card {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    .matrix-table th, .matrix-table td {
      padding: 16px;
      border-bottom: 1px solid #374151;
    }
    .perm-header {
      width: 300px;
      color: #e5e7eb;
      font-weight: 600;
    }
    .role-header {
      text-align: center;
      color: #e5e7eb;
    }
    .role-title {
      font-weight: 600;
      font-size: 14px;
    }
    .role-badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 9999px;
      background-color: #374151;
      color: #d1d5db;
    }
    .perm-cell {
      display: flex;
      flex-direction: column;
    }
    .perm-name {
      color: #f3f4f6;
      font-weight: 500;
      font-size: 14px;
    }
    .perm-code {
      color: #6b7280;
      font-size: 11px;
      margin-top: 2px;
    }
    .checkbox-cell {
      text-align: center;
    }
    .custom-checkbox {
      display: inline-block;
      position: relative;
      cursor: pointer;
      user-select: none;
      width: 20px;
      height: 20px;
    }
    .custom-checkbox input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 20px;
      width: 20px;
      background-color: #374151;
      border: 1px solid #4b5563;
      border-radius: 4px;
    }
    .custom-checkbox input:checked ~ .checkmark {
      background-color: var(--primary-color, #2563eb);
      border-color: var(--primary-color, #2563eb);
    }
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }
    .custom-checkbox input:checked ~ .checkmark:after {
      display: block;
    }
    .custom-checkbox .checkmark:after {
      left: 6px;
      top: 2px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
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