import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';

/**
 * قائمة طلبات الالتحاق — لغة تصميم Nebras OS.
 * مبنية على المحرّك المشترك ApplicantQueueComponent (بيانات حقيقية: admissions/applicants).
 */
@Component({
  selector: 'app-applications-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="قائمة طلبات الالتحاق"
      subtitle="جميع طلبات القبول والتسجيل — بحث وتصفية والانتقال إلى تفاصيل كل طلب."
      emptyText="لا توجد طلبات التحاق مسجلة حالياً."
      createLink="/admissions/applications/new"
    ></app-applicant-queue>
  `,
})
export class ApplicationsListComponent {}
