import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface SignupPayload {
  school_name: string;
  subdomain: string;
  state: string;
  contact_name: string;
  phone: string;
  email: string;
  plan_name: string;
}

@Component({
  selector: 'app-nebras-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './nebras-home.component.html',
  styleUrls: ['./nebras-home.component.scss'],
})
export class NebrasHomeComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  billingCycle = signal<'annual' | 'monthly'>('annual');
  submitting = signal(false);
  submitted = signal(false);
  subdomainChecking = signal(false);
  subdomainStatus = signal<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  errorMessage = signal<string | null>(null);

  form: SignupPayload = {
    school_name: '',
    subdomain: '',
    state: 'ولاية الخرطوم (الخرطوم / بحري / أمدرمان)',
    contact_name: '',
    phone: '',
    email: '',
    plan_name: 'باقة النمو والتوسع',
  };

  sudaneseStates = [
    'ولاية الخرطوم (الخرطوم / بحري / أمدرمان)',
    'ولاية البحر الأحمر (بورتسودان)',
    'ولاية نهر النيل (عطبرة / الدامر / شندي)',
    'ولاية الجزيرة (ود مدني / المناقل)',
    'الولاية الشمالية (دنقلا / مروي / الدبة)',
    'ولاية كسلا',
    'ولاية القضارف',
    'ولاية النيل الأبيض (ربك / كوستي)',
    'ولاية سنار',
    'ولايات دارفور (الفاشر / نيالا / الجنينة)',
    'ولايات كردفان (الأبيض / كادوقلي)',
  ];

  ngOnInit(): void {
    // Scroll to top on load
    window.scrollTo(0, 0);
  }

  goToLogin(): void {
    this.router.navigate(['/accounts/login']);
  }

  scrollTo(elementId: string): void {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  setBillingCycle(cycle: 'annual' | 'monthly'): void {
    this.billingCycle.set(cycle);
  }

  selectPlan(planName: string): void {
    this.form.plan_name = planName;
    this.scrollTo('free-trial');
  }

  onSubdomainInput(): void {
    const raw = (this.form.subdomain || '').toLowerCase().trim();
    const clean = raw.replace(/[^a-z0-9-]/g, '');
    this.form.subdomain = clean;

    if (!clean || clean.length < 3) {
      this.subdomainStatus.set('idle');
      return;
    }

    this.subdomainChecking.set(true);
    const url = `${environment.apiUrl}/saas/signup-requests/check-subdomain/?subdomain=${encodeURIComponent(clean)}`;
    this.http.get<{ available: boolean }>(url).subscribe({
      next: (res) => {
        this.subdomainChecking.set(false);
        this.subdomainStatus.set(res.available ? 'available' : 'taken');
      },
      error: () => {
        this.subdomainChecking.set(false);
        // Fallback: validate format
        this.subdomainStatus.set(clean.length >= 3 ? 'available' : 'invalid');
      },
    });
  }

  submitTrial(): void {
    if (!this.form.school_name || !this.form.subdomain || !this.form.contact_name || !this.form.phone) {
      this.errorMessage.set('يرجى ملء جميع الحقول المطلوبة لتقديم طلب التجربة.');
      return;
    }

    if (this.subdomainStatus() === 'taken') {
      this.errorMessage.set('النطاق الفرعي المطلوب محجوز مسبقاً، يرجى اختيار نطاق آخر.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.form,
      trial_days: 7,
    };

    const url = `${environment.apiUrl}/saas/signup-requests/`;
    this.http.post(url, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail || err?.error?.subdomain?.[0] || 'تعذر إرسال الطلب حالياً، يرجى المحاولة مرة أخرى.';
        this.errorMessage.set(detail);
      },
    });
  }
}
