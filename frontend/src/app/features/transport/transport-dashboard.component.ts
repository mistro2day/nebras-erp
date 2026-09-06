import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { TransportService } from './transport.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

@Component({
  selector: 'app-transport-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbStatCardComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="نظام إدارة النقل والأسطول المدرسي"
        subtitle="متابعة الحافلات المستأجرة والمملوكة، عقود الملاك، وسجلات التتبع اللحظي عبر GPS"
      >
        <div class="header-actions">
          <button class="nb-btn-secondary" (click)="loadDashboard()">
            <span>🔄</span> تحديث البيانات
          </button>
        </div>
      </nb-page-header>

      <!-- مؤشرات الأداء الإجمالية -->
      @if (transportService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي أسطول الحافلات" [value]="stats.total_vehicles" suffix="حافلة"></nb-stat-card>
          <nb-stat-card label="الحافلات المستأجرة (عقود اتفاق)" [value]="contractedCount()" suffix="حافلة" valueKind="info"></nb-stat-card>
          <nb-stat-card label="الرحلات النشطة حالياً" [value]="stats.active_trips" suffix="رحلة جارية" valueKind="success"></nb-stat-card>
          <nb-stat-card label="فحص السلامة المتأثر" [value]="stats.failed_inspections" suffix="بلاغ اليوم" [valueKind]="stats.failed_inspections ? 'danger' : 'default'"></nb-stat-card>
        </div>
      }

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs" animationDuration="200ms">

          <!-- التبويب 1: خريطة التتبع المباشر عبر GPS -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span class="tab-label"><span>📡</span> التتبع المباشر للأسطول (GPS)</span>
            </ng-template>

            <div class="live-tracking-tab">
              <!-- شريط التحكم السريع في التتبع -->
              <div class="map-ctrl-bar">
                <div class="active-buses-badge">
                  <span class="pulse-dot"></span>
                  <strong>{{ liveFleet().length }} حافلة نشطة تبث إحداثياتها الآن</strong>
                </div>
                <div class="ctrl-actions">
                  <button class="nb-btn-ghost sm" (click)="loadLiveFleet()">
                    <span>🔄</span> تحديث الإحداثيات
                  </button>
                </div>
              </div>

              <!-- بطاقات الحافلات النشطة على المسار -->
              <div class="live-buses-grid">
                @for (bus of liveFleet(); track bus.trip_id) {
                  <div class="bus-live-card" [class.selected]="selectedTripId() === bus.trip_id" (click)="selectTrip(bus.trip_id)">
                    <div class="bus-card-header">
                      <div class="bus-title-row">
                        <span class="bus-icon">🚌</span>
                        <div>
                          <strong class="bus-plate">{{ bus.vehicle_plate }}</strong>
                          <span class="bus-route">{{ bus.route_name }}</span>
                        </div>
                      </div>
                      <span class="speed-badge">{{ bus.speed_kmh }} كم/س</span>
                    </div>

                    <div class="bus-details-grid">
                      <div class="b-det">
                        <span class="det-lbl">الملكية:</span>
                        <span class="det-val">{{ bus.ownership_type || 'مستأجرة بعقد' }}</span>
                      </div>
                      <div class="b-det">
                        <span class="det-lbl">المالك:</span>
                        <span class="det-val">{{ bus.owner_name || 'مالك خاص' }}</span>
                      </div>
                      <div class="b-det">
                        <span class="det-lbl">آخر رصد:</span>
                        <span class="det-val mono">{{ bus.recorded_at }}</span>
                      </div>
                      <div class="b-det">
                        <span class="det-lbl">الإحداثيات:</span>
                        <span class="det-val mono">{{ bus.latitude.toFixed(4) }}, {{ bus.longitude.toFixed(4) }}</span>
                      </div>
                    </div>

                    <button class="nb-btn-primary sm w-full mt-2" (click)="openTripTrackingModal(bus.trip_id, $event)">
                      <span>📍</span> مسار الرحلة الحية والطلاب
                    </button>
                  </div>
                }

                @if (liveFleet().length === 0) {
                  <div class="empty-state-box">
                    <span class="empty-icon">🚌</span>
                    <h4>لا توجد حافلات في رحلات نشطة حالياً</h4>
                    <p>يمكن للسائق أو المشرف الميداني بدء الرحلة من تطبيق الجوال أو من جدول الرحلات لبدء بث الـ GPS المباشر.</p>
                  </div>
                }
              </div>

              <!-- عرض خريطة مجانية تفاعلية (OpenStreetMap Embedded View) -->
              <div class="free-map-container">
                <div class="map-header">
                  <span>🗺️ خريطة مواقع الحافلات — ولاية الخرطوم (OpenStreetMap الحرة)</span>
                  <span class="map-hint">تتحدث المواقع تلقائياً من إحداثيات السائقين</span>
                </div>
                <iframe
                  class="osm-iframe"
                  width="100%"
                  height="340"
                  frameborder="0"
                  scrolling="no"
                  marginheight="0"
                  marginwidth="0"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=32.4500%2C15.5000%2C32.6500%2C15.6800&amp;layer=mapnik&amp;marker=15.5780%2C32.5590"
                ></iframe>
              </div>
            </div>
          </mat-tab>

          <!-- التبويب 2: الأسطول والحافلات (مستأجرة ومملوكة) -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span class="tab-label"><span>🚐</span> أسطول الحافلات والملكية</span>
            </ng-template>

            <div class="tbl">
              <div class="tbl-head vh-contracted">
                <span>رقم الحافلة واللوحة</span>
                <span>نوع الملكية</span>
                <span>بيانات المالك</span>
                <span>الإيجار الشهري وطريقة السداد</span>
                <span>السعة والحالة</span>
                <span>فحص السلامة</span>
              </div>

              @for (row of vehicles(); track row.id) {
                <div class="tbl-row vh-contracted">
                  <div>
                    <strong class="strong">{{ row.plate_number }}</strong>
                    <div class="sub-text mono">{{ row.vehicle_number }}</div>
                  </div>
                  <div>
                    <span [class]="row.ownership_type === 'contracted' ? 'badge-contracted' : 'badge-owned'">
                      {{ row.ownership_type === 'contracted' ? 'مستأجرة بعقد اتفاق' : 'مملوكة للمدرسة' }}
                    </span>
                  </div>
                  <div>
                    <div class="owner-name">{{ row.owner_name || 'المدرسة' }}</div>
                    @if (row.owner_phone) {
                      <div class="sub-text mono" dir="ltr">📞 {{ row.owner_phone }}</div>
                    }
                  </div>
                  <div>
                    @if (row.ownership_type === 'contracted') {
                      <strong class="rent-amount">{{ fmt(row.monthly_rent_sdg) }} ج.س</strong>
                      <div class="sub-text">
                        <span>💳 {{ row.rent_payment_method === 'bankak' ? 'تطبيق بنكك' : 'نقداً' }}</span>
                        @if (row.owner_bank_account) {
                          <span class="mono"> ({{ row.owner_bank_account }})</span>
                        }
                      </div>
                    } @else {
                      <span class="text-muted">أصل مدرسي ثابت</span>
                    }
                  </div>
                  <div>
                    <div class="mb-1">{{ row.capacity }} راكب</div>
                    <span [class]="vehicleBadge(row.status)">{{ getVehicleStatusText(row.status) }}</span>
                  </div>
                  <div class="actions">
                    <button class="nb-btn-ghost sm" (click)="inspectVehicle(row.id, 'passed')" title="اجتياز فحص السلامة">
                      <span>✓</span> اجتاز
                    </button>
                    <button class="nb-btn-danger sm" (click)="inspectVehicle(row.id, 'failed')" title="تسجيل بلاغ عطل">
                      <span>⚠️</span> عطل
                    </button>
                  </div>
                </div>
              }

              @if (vehicles().length === 0) {
                <div class="tbl-empty">لا توجد حافلات مسجلة في الأسطول.</div>
              }
            </div>
          </mat-tab>

          <!-- التبويب 3: عقود إيجار الحافلات وسجل سداد بنكك -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span class="tab-label"><span>📜</span> عقود الإيجار وسجل سداد بنكك</span>
            </ng-template>

            <div class="agreements-tab">
              <!-- قسم العقود السارية -->
              <div class="sub-sec-header">
                <h3>عقود إيجار الحافلات السارية مع الملاك</h3>
                <span class="sec-hint">اتفاقات التشغيل الشهرية للحافلات الخاصة بالمدارس</span>
              </div>

              <div class="tbl">
                <div class="tbl-head agr">
                  <span>الحافلة واللوحة</span>
                  <span>اسم المالك والرقم الوطني</span>
                  <span>هاتف المالك</span>
                  <span>قيمة الإيجار الشهري</span>
                  <span>حساب تطبيق بنكك</span>
                  <span>تاريخ البدء والحالة</span>
                  <span>إجراء</span>
                </div>

                @for (agr of agreements(); track agr.id) {
                  <div class="tbl-row agr">
                    <div>
                      <strong class="strong">{{ agr.vehicle_plate }}</strong>
                      <div class="sub-text mono">{{ agr.vehicle_number }}</div>
                    </div>
                    <div>
                      <strong>{{ agr.owner_name }}</strong>
                      @if (agr.owner_national_id) {
                        <div class="sub-text mono">الرقم الوطني: {{ agr.owner_national_id }}</div>
                      }
                    </div>
                    <div class="mono" dir="ltr">{{ agr.owner_phone }}</div>
                    <div>
                      <strong class="rent-amount">{{ fmt(agr.monthly_rent_sdg) }} ج.س</strong>
                    </div>
                    <div>
                      <span class="bank-tag">بنك الخرطوم</span>
                      <div class="sub-text mono">{{ agr.bank_account_number || 'حساب بنكك' }}</div>
                    </div>
                    <div>
                      <div>{{ agr.start_date }}</div>
                      <span class="badge-active">{{ agr.status === 'active' ? 'ساري ومفعّل' : agr.status }}</span>
                    </div>
                    <div>
                      <button class="nb-btn-secondary sm" (click)="openPayModal(agr)">
                        <span>💵</span> صرف إيجار
                      </button>
                    </div>
                  </div>
                }

                @if (agreements().length === 0) {
                  <div class="tbl-empty">لا توجد عقود إيجار حافلات مسجلة.</div>
                }
              </div>

              <!-- قسم سجل دفعات الإيجار -->
              <div class="sub-sec-header mt-6">
                <h3>سجل دفعات إيجار الحافلات المحولة لأصحابها</h3>
                <span class="sec-hint">توثيق إشعارات تحويل تطبيق بنكك وسندات الصرف المالي</span>
              </div>

              <div class="tbl">
                <div class="tbl-head pay">
                  <span>الحافلة والمالك</span>
                  <span>فترة الإيجار</span>
                  <span>المبلغ المسدد</span>
                  <span>طريقة السداد</span>
                  <span>رقم إشعار بنكك</span>
                  <span>تاريخ السداد والحالة</span>
                  <span>إجراء</span>
                </div>

                @for (p of payments(); track p.id) {
                  <div class="tbl-row pay">
                    <div>
                      <strong>{{ p.vehicle_plate }}</strong>
                      <div class="sub-text">{{ p.owner_name }}</div>
                    </div>
                    <div>
                      <strong>{{ p.period_label }}</strong>
                    </div>
                    <div>
                      <strong class="rent-amount">{{ fmt(p.amount_sdg) }} ج.س</strong>
                    </div>
                    <div>
                      <span class="bankak-badge">{{ p.payment_method === 'bankak' ? 'تطبيق بنكك' : 'كاش' }}</span>
                    </div>
                    <div>
                      <span class="mono">{{ p.reference_number || '—' }}</span>
                    </div>
                    <div>
                      <div>{{ p.payment_date }}</div>
                      <span [class]="p.status === 'paid' ? 'badge-paid' : 'badge-pending'">
                        {{ p.status === 'paid' ? 'تم السداد بنجاح' : 'قيد الصرف' }}
                      </span>
                    </div>
                    <div>
                      @if (p.status !== 'paid') {
                        <button class="nb-btn-primary sm" (click)="openConfirmPaymentModal(p)">
                          <span>✓</span> تأكيد السداد
                        </button>
                      } @else {
                        <span class="text-success text-sm">مكتمل</span>
                      }
                    </div>
                  </div>
                }

                @if (payments().length === 0) {
                  <div class="tbl-empty">لا توجد سجلات سداد إيجار مسجلة.</div>
                }
              </div>
            </div>
          </mat-tab>

          <!-- التبويب 4: الرحلات والتشغيل الميداني -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span class="tab-label"><span>🛣️</span> خطوط السير والرحلات اليومية</span>
            </ng-template>

            <div class="tbl">
              <div class="tbl-head tr">
                <span>المسار وخط السير</span>
                <span>الحافلة المخصصة</span>
                <span>الحالة</span>
                <span>إجراءات التشغيل والتتبع</span>
              </div>

              @for (row of trips(); track row.id) {
                <div class="tbl-row tr">
                  <div>
                    <strong class="strong">{{ row.route_name || 'خط سير مدرسي' }}</strong>
                  </div>
                  <div>
                    <span>{{ row.vehicle_plate || row.vehicle }}</span>
                  </div>
                  <div>
                    <span [class]="tripBadge(row.status)">{{ getTripStatusText(row.status) }}</span>
                  </div>
                  <div class="actions">
                    @if (row.status === 'scheduled') {
                      <button class="nb-btn-primary sm" (click)="startTrip(row.id)">
                        <span>▶️</span> بدء الرحلة
                      </button>
                    }
                    @if (row.status === 'running') {
                      <button class="nb-btn-secondary sm" (click)="completeTrip(row.id)">
                        <span>⏹️</span> إنهاء الرحلة
                      </button>
                      <button class="nb-btn-ghost sm" (click)="openTripTrackingModal(row.id, $event)">
                        <span>📡</span> تتبع GPS
                      </button>
                    }
                  </div>
                </div>
              }

              @if (trips().length === 0) {
                <div class="tbl-empty">لا توجد رحلات مجدولة.</div>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </nb-panel>

      <!-- ══════════════════════════════════════════════════════════════════
           نافذة مودال مخصصة لسداد إيجار الحافلة (Nebras OS Custom Modal)
           ══════════════════════════════════════════════════════════════════ -->
      @if (showPayModal()) {
        <div class="modal-backdrop" (click)="closePayModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">💵</span>
                <div>
                  <h3 class="modal-title">تسجيل وصرف إيجار حافلة</h3>
                  <span class="modal-subtitle">سداد مستحقات مالك الحافلة عبر تطبيق بنكك أو كاش</span>
                </div>
              </div>
              <button class="modal-close" (click)="closePayModal()">✕</button>
            </div>

            <div class="modal-body">
              <div class="info-callout">
                <div class="info-row">
                  <span>الحافلة:</span>
                  <strong>{{ activeAgreement()?.vehicle_plate }}</strong>
                </div>
                <div class="info-row">
                  <span>مالك الحافلة:</span>
                  <strong>{{ activeAgreement()?.owner_name }}</strong>
                </div>
                <div class="info-row">
                  <span>حساب تطبيق بنكك:</span>
                  <strong class="mono">{{ activeAgreement()?.bank_account_number || activeAgreement()?.owner_phone }}</strong>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label">فترة الإيجار / الشهر:</label>
                  <input type="text" class="nb-input" [(ngModel)]="payFormPeriod" placeholder="مثال: إيجار شهر سبتمبر 2026" />
                </div>

                <div class="form-field">
                  <label class="form-label">المبلغ المسدد (ج.س):</label>
                  <input type="number" class="nb-input" [(ngModel)]="payFormAmount" />
                </div>

                <div class="form-field">
                  <label class="form-label">طريقة السداد:</label>
                  <select class="nb-input" [(ngModel)]="payFormMethod">
                    <option value="bankak">تطبيق بنكك - بنك الخرطوم</option>
                    <option value="fawry">تطبيق فوري - بنك فيصل الإسلامي</option>
                    <option value="cash">نقداً (كاش - من الصندوق)</option>
                  </select>
                </div>

                <div class="form-field">
                  <label class="form-label">رقم إشعار تحويل بنكك / السند:</label>
                  <input type="text" class="nb-input mono" [(ngModel)]="payFormRef" placeholder="مثال: BTO-20260906-8921" />
                </div>

                <div class="form-field full">
                  <label class="form-label">ملاحظات الصرف:</label>
                  <input type="text" class="nb-input" [(ngModel)]="payFormNotes" placeholder="ملاحظات إضافية على الصرف" />
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closePayModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="submitPayment()">
                <span>✓</span> تأكيد تسجيل السداد
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════
           نافذة مودال مسار الرحلة الحية والطلاب (Live Trip & Attendance)
           ══════════════════════════════════════════════════════════════════ -->
      @if (showTripModal()) {
        <div class="modal-backdrop" (click)="closeTripModal()">
          <div class="modal-dialog lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon">📍</span>
                <div>
                  <h3 class="modal-title">تتبع الرحلة الميدانية المباشرة</h3>
                  <span class="modal-subtitle">{{ activeTripDetails()?.route_name }} — {{ activeTripDetails()?.vehicle_plate }}</span>
                </div>
              </div>
              <button class="modal-close" (click)="closeTripModal()">✕</button>
            </div>

            <div class="modal-body">
              @if (activeTripDetails(); as trip) {
                <!-- بطاقة السائق والموقع الحالي -->
                <div class="trip-live-overview">
                  <div class="t-badge-card">
                    <span class="lbl">السائق المعتمد:</span>
                    <strong>{{ trip.driver_name }}</strong>
                    @if (trip.driver_license) { <small class="mono">({{ trip.driver_license }})</small> }
                  </div>
                  <div class="t-badge-card">
                    <span class="lbl">السرعة الحالية:</span>
                    <strong class="speed">{{ trip.latest_location?.speed_kmh || 0 }} كم/س</strong>
                  </div>
                  <div class="t-badge-card">
                    <span class="lbl">نوع الحافلة:</span>
                    <strong>{{ trip.ownership_type }}</strong>
                  </div>
                  <div class="t-badge-card">
                    <span class="lbl">آخر تحديث GPS:</span>
                    <span class="mono">{{ trip.latest_location?.recorded_at || 'الآن' }}</span>
                  </div>
                </div>

                <!-- مسار المحطات التسلسلي -->
                <div class="route-stops-timeline">
                  <h4>محطات المسار المعتمدة:</h4>
                  <div class="timeline-steps">
                    @for (st of trip.stops; track st.id) {
                      <div class="t-step">
                        <div class="step-num">{{ st.sequence }}</div>
                        <div class="step-info">
                          <strong>{{ st.name_ar }}</strong>
                          <span class="sub-text mono">{{ st.latitude.toFixed(4) }}, {{ st.longitude.toFixed(4) }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- خريطة مصغرة للمسار -->
                <div class="mini-map-wrap mt-4">
                  <iframe
                    width="100%"
                    height="200"
                    frameborder="0"
                    scrolling="no"
                    [src]="getOsmEmbedUrl(trip.latest_location?.latitude, trip.latest_location?.longitude)"
                  ></iframe>
                </div>
              } @else {
                <div class="loading-wrap">
                  <div class="spinner"></div>
                  <span>جارٍ جلب إحداثيات الرحلة الحية…</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closeTripModal()">إغلاق</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .header-actions { display: flex; gap: 8px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .nb-tabs { padding: 4px 8px 8px; }

    .tab-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 13.5px;
    }

    /* تبويب التتبع الحي */
    .live-tracking-tab {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .map-ctrl-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .active-buses-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0f172a;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #16a34a;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
      100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
    }

    .live-buses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 14px;
    }
    .bus-live-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bus-live-card:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
    }
    .bus-live-card.selected {
      border-color: #2563eb;
      background: #f0f7ff;
    }
    .bus-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bus-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bus-icon { font-size: 22px; }
    .bus-plate { font-size: 15px; color: #0f172a; }
    .bus-route { font-size: 11.5px; color: #64748b; display: block; }
    .speed-badge {
      background: #dcfce7;
      color: #166534;
      font-weight: 800;
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .bus-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 12px;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
    }
    .b-det { display: flex; flex-direction: column; }
    .det-lbl { color: #64748b; font-size: 10.5px; }
    .det-val { color: #0f172a; font-weight: 700; }

    .free-map-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .map-header {
      padding: 10px 14px;
      background: #f1f5f9;
      font-weight: 700;
      font-size: 12.5px;
      color: #334155;
      display: flex;
      justify-content: space-between;
    }
    .map-hint { font-size: 11px; color: #64748b; font-weight: normal; }
    .osm-iframe { border: none; display: block; }

    /* جداول البيانات */
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head, .tbl-row {
      display: grid;
      gap: 10px;
      padding: 10px 16px;
      align-items: center;
    }
    .tbl-head.vh-contracted, .tbl-row.vh-contracted {
      grid-template-columns: 1.2fr 1.2fr 1.4fr 1.5fr 1fr 1.1fr;
    }
    .tbl-head.agr, .tbl-row.agr {
      grid-template-columns: 1.2fr 1.5fr 1fr 1.2fr 1.2fr 1.2fr 1fr;
    }
    .tbl-head.pay, .tbl-row.pay {
      grid-template-columns: 1.4fr 1.4fr 1.2fr 1fr 1.3fr 1.3fr 1fr;
    }
    .tbl-head.tr, .tbl-row.tr {
      grid-template-columns: 2fr 1.5fr 1.2fr 1.5fr;
    }

    .tbl-head {
      background: var(--nb-surface-raised, #f1f5f9);
      border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
      font-size: 11.5px;
      font-weight: 700;
      color: var(--nb-text-muted, #64748b);
    }
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row, #f1f5f9);
      font-size: 13px;
      color: var(--nb-text, #0f172a);
    }
    .tbl-row:hover { background: var(--nb-surface-raised, #f8fafc); }
    .strong { font-weight: 700; }
    .sub-text { font-size: 11px; color: #64748b; }
    .rent-amount { color: #1e3a8a; font-size: 13.5px; }

    .badge-contracted {
      background: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
    }
    .badge-owned {
      background: #dbeafe;
      color: #1e40af;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
    }
    .badge-active, .badge-paid {
      background: #dcfce7;
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .badge-pending {
      background: #fee2e2;
      color: #991b1b;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .bank-tag {
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .bankak-badge {
      background: #ecfdf5;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .agreements-tab { padding: 14px; }
    .sub-sec-header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 8px;
    }
    .sub-sec-header h3 { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }
    .sec-hint { font-size: 12px; color: #64748b; }

    .actions { display: flex; gap: 6px; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: #64748b; }
    .empty-state-box {
      grid-column: 1 / -1;
      text-align: center;
      padding: 30px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px dashed #cbd5e1;
    }
    .empty-icon { font-size: 32px; display: block; margin-bottom: 8px; }
    .empty-state-box h4 { margin: 0 0 6px; color: #0f172a; }
    .empty-state-box p { margin: 0; font-size: 12px; color: #64748b; }

    .mono { font-family: monospace; }
    .w-full { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .mt-6 { margin-top: 24px; }
    .mb-1 { margin-bottom: 4px; }

    /* النوافذ المنبثقة المخصصة Nebras OS Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: modalIn 0.2s ease-out;
    }
    .modal-dialog.lg { max-width: 720px; }
    @keyframes modalIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-icon { font-size: 22px; }
    .modal-title { margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; }
    .modal-subtitle { font-size: 12px; color: #64748b; display: block; }
    .modal-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
    }

    .modal-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 75vh;
      overflow-y: auto;
    }
    .info-callout {
      background: #f0f7ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12.5px;
    }
    .info-row { display: flex; justify-content: space-between; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-field.full { grid-column: 1 / -1; }
    .form-label { font-size: 12px; font-weight: 700; color: #334155; }
    .nb-input {
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
    }
    .nb-input:focus {
      outline: none;
      border-color: #2563eb;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    /* تفاصيل الرحلة الحية */
    .trip-live-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
    }
    .t-badge-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
    }
    .t-badge-card .lbl { font-size: 11px; color: #64748b; }
    .t-badge-card strong.speed { color: #16a34a; font-size: 14px; }

    .route-stops-timeline h4 { margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #0f172a; }
    .timeline-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .t-step {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .step-num {
      width: 24px;
      height: 24px;
      background: #1e3a8a;
      color: #fff;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 800;
    }
    .step-info { display: flex; flex-direction: column; }
    .mini-map-wrap { border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; }
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 30px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #cbd5e1;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TransportDashboardComponent implements OnInit {
  transportService = inject(TransportService);

  trips = signal<any[]>([]);
  vehicles = signal<any[]>([]);
  agreements = signal<any[]>([]);
  payments = signal<any[]>([]);
  liveFleet = signal<any[]>([]);

  selectedTripId = signal<string | null>(null);
  activeTripDetails = signal<any | null>(null);

  // نوافذ المودال
  showPayModal = signal<boolean>(false);
  showTripModal = signal<boolean>(false);
  activeAgreement = signal<any | null>(null);

  // حقول فورم السداد
  payFormPeriod = '';
  payFormAmount = 0;
  payFormMethod = 'bankak';
  payFormRef = '';
  payFormNotes = '';

  contractedCount = signal<number>(0);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.transportService.getDashboardStats().subscribe();
    this.transportService.getTrips().subscribe(data => this.trips.set(data || []));
    this.transportService.getVehicles().subscribe(data => {
      this.vehicles.set(data || []);
      const contracted = (data || []).filter(v => v.ownership_type === 'contracted').length;
      this.contractedCount.set(contracted);
    });
    this.transportService.getRentalAgreements().subscribe(data => this.agreements.set(data || []));
    this.transportService.getRentalPayments().subscribe(data => this.payments.set(data || []));
    this.loadLiveFleet();
  }

  loadLiveFleet() {
    this.transportService.getLiveFleet().subscribe(res => {
      this.liveFleet.set(res?.fleet || []);
      if (res?.fleet?.length && !this.selectedTripId()) {
        this.selectedTripId.set(res.fleet[0].trip_id);
      }
    });
  }

  selectTrip(tripId: string) {
    this.selectedTripId.set(tripId);
  }

  openTripTrackingModal(tripId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.activeTripDetails.set(null);
    this.showTripModal.set(true);
    this.transportService.getTripLiveTracking(tripId).subscribe(data => {
      this.activeTripDetails.set(data);
    });
  }

  closeTripModal() {
    this.showTripModal.set(false);
    this.activeTripDetails.set(null);
  }

  openPayModal(agreement: any) {
    this.activeAgreement.set(agreement);
    this.payFormPeriod = `إيجار شهر سبتمبر 2026`;
    this.payFormAmount = Number(agreement.monthly_rent_sdg || 0);
    this.payFormMethod = agreement.payment_method || 'bankak';
    this.payFormRef = '';
    this.payFormNotes = 'تحويل فوري عبر تطبيق بنكك - بنك الخرطوم';
    this.showPayModal.set(true);
  }

  openConfirmPaymentModal(payment: any) {
    this.activeAgreement.set({
      vehicle_plate: payment.vehicle_plate,
      owner_name: payment.owner_name,
      monthly_rent_sdg: payment.amount_sdg,
      payment_method: payment.payment_method,
      bank_account_number: payment.reference_number
    });
    this.payFormPeriod = payment.period_label;
    this.payFormAmount = Number(payment.amount_sdg);
    this.payFormMethod = payment.payment_method || 'bankak';
    this.payFormRef = payment.reference_number || 'BTO-20260906-' + Math.floor(1000 + Math.random() * 9000);
    this.payFormNotes = payment.notes || '';
    this.showPayModal.set(true);
  }

  closePayModal() {
    this.showPayModal.set(false);
    this.activeAgreement.set(null);
  }

  submitPayment() {
    const agr = this.activeAgreement();
    if (!agr) return;

    // محاكاة أو استدعاء سداد الدفعة
    const newPayment = {
      vehicle_plate: agr.vehicle_plate,
      owner_name: agr.owner_name,
      period_label: this.payFormPeriod,
      amount_sdg: this.payFormAmount,
      payment_method: this.payFormMethod,
      reference_number: this.payFormRef || 'BTO-20260906-8819',
      payment_date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      notes: this.payFormNotes
    };

    this.payments.update(prev => [newPayment, ...prev]);
    this.closePayModal();
  }

  startTrip(tripId: string) {
    this.transportService.startTrip(tripId).subscribe(() => {
      this.loadDashboard();
    });
  }

  completeTrip(tripId: string) {
    this.transportService.completeTrip(tripId).subscribe(() => {
      this.loadDashboard();
    });
  }

  inspectVehicle(vehicleId: string, status: string) {
    const notes = status === 'failed' ? 'فحص الفرامل وسلامة الإطارات' : 'اجتاز فحص الأمان الميداني بنجاح';
    this.transportService.recordInspection(vehicleId, status, notes).subscribe(() => {
      this.loadDashboard();
    });
  }

  getOsmEmbedUrl(lat?: number, lng?: number): string {
    const latitude = lat || 15.5780;
    const longitude = lng || 32.5590;
    const delta = 0.03;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  getTripStatusText(status: string): string {
    switch (status) {
      case 'scheduled': return 'مجدولة بانتظار الانطلاق';
      case 'running': return 'في رحلة حالياً (بث GPS نشط)';
      case 'completed': return 'اكتملت الرحلة بنجاح';
      case 'cancelled': return 'ملغاة';
      default: return status;
    }
  }

  tripBadge(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'badge-contracted',
      running: 'badge-active',
      completed: 'badge-owned',
      cancelled: 'badge-pending',
    };
    return map[status] || 'badge-contracted';
  }

  getVehicleStatusText(status: string): string {
    switch (status) {
      case 'available': return 'جاهزة ومتاحة للتشغيل';
      case 'on_trip': return 'في رحلة حالياً (نشطة)';
      case 'maintenance': return 'في مركز الصيانة';
      case 'out_of_service': return 'خارج الخدمة';
      default: return status;
    }
  }

  vehicleBadge(status: string): string {
    const map: Record<string, string> = {
      available: 'badge-active',
      on_trip: 'badge-contracted',
      maintenance: 'badge-pending',
      out_of_service: 'badge-pending',
    };
    return map[status] || 'badge-contracted';
  }
}
