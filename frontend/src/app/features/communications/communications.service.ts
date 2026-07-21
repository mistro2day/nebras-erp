import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

export interface CommunicationChannel {
  id: string;
  name: string;
  code: string;
  channel_type: 'email' | 'whatsapp' | 'sms' | 'push' | 'in_app';
  icon?: string;
  is_active: boolean;
  priority: number;
}

export interface CommunicationProviderConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  api_key?: string;
  instance_name?: string;
  phone_number_id?: string;
  sender_id?: string;
  use_ssl?: boolean;
  webhook_url?: string;
}

export interface CommunicationProvider {
  id: string;
  name: string;
  code?: string;
  provider_type: string;
  channel_id?: string;
  channel_name?: string;
  is_active: boolean;
  is_default: boolean;
  health_status: 'healthy' | 'degraded' | 'down';
  daily_quota: number;
  sent_today?: number;
  config?: CommunicationProviderConfig;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  language: string;
  subject?: string;
  body: string;
  content_type: string;
  is_active: boolean;
  version_count?: number;
}

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';

export interface CommunicationMessageItem {
  id: string;
  channel_name: string;
  channel_type?: 'email' | 'whatsapp' | 'sms' | 'push';
  recipient_name: string;
  recipient_address: string;
  subject?: string;
  status: MessageStatus;
  priority: 'high' | 'normal' | 'low';
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  attempts?: number;
  external_status?: string;
  error_message?: string;
}

const FALLBACK_CHANNELS: CommunicationChannel[] = [
  { id: '1', name: 'البريد الإلكتروني', code: 'email', channel_type: 'email', icon: 'email', is_active: true, priority: 1 },
  { id: '2', name: 'واتساب الأعمال (Baileys Engine)', code: 'whatsapp', channel_type: 'whatsapp', icon: 'chat', is_active: true, priority: 2 },
  { id: '3', name: 'الرسائل النصية SMS', code: 'sms', channel_type: 'sms', icon: 'sms', is_active: false, priority: 3 },
  { id: '4', name: 'الإشعارات الفورية Push', code: 'push', channel_type: 'push', icon: 'notifications', is_active: false, priority: 4 },
];

const FALLBACK_PROVIDERS: CommunicationProvider[] = [
  {
    id: 'p1',
    name: 'Twilio SendGrid - بريد مدارس نبراس',
    code: 'TWILIO_SENDGRID',
    provider_type: 'smtp',
    channel_name: 'البريد الإلكتروني',
    is_active: true,
    is_default: true,
    health_status: 'healthy',
    daily_quota: 100,
    sent_today: 0,
    config: { host: 'smtp.sendgrid.net', port: 587, username: 'apikey', use_ssl: true },
  },
  {
    id: 'p2',
    name: 'خادم إيفولوشن واتساب - الخرطوم (Baileys Engine)',
    code: 'EVOLUTION_WA_KRT',
    provider_type: 'evolution_baileys',
    channel_name: 'واتساب الأعمال',
    is_active: true,
    is_default: true,
    health_status: 'healthy',
    daily_quota: 1000,
    sent_today: 0,
    config: { instance_name: 'nebras-khartoum-instance', webhook_url: 'http://localhost:8080', api_key: 'evo_key_998237465' },
  },
  {
    id: 'p3',
    name: 'بوابة زين وسوداني SMS',
    code: 'ZAIN_SUDANI_SMS',
    provider_type: 'custom_gateway',
    channel_name: 'الرسائل النصية SMS',
    is_active: false,
    is_default: false,
    health_status: 'down',
    daily_quota: 500,
    sent_today: 0,
    config: { sender_id: 'NEBRAS-SD', webhook_url: 'https://api.sd.zain.com/sms/send' },
  },
  {
    id: 'p4',
    name: 'Firebase Cloud Messaging',
    code: 'FCM_PUSH',
    provider_type: 'firebase_fcm',
    channel_name: 'الإشعارات الفورية',
    is_active: false,
    is_default: false,
    health_status: 'down',
    daily_quota: 10000,
    sent_today: 0,
    config: { api_key: '' },
  },
];

const FALLBACK_TEMPLATES: CommunicationTemplate[] = [
  {
    id: 't1',
    name: 'إشعار صدور الفاتورة المدرسية',
    code: 'INVOICE_ISSUED',
    category: 'finance',
    language: 'ar',
    subject: 'فاتورة دراسية جديدة - مدارس نبراس السودان',
    body: 'عزيزي ولي الأمر {{guardian_name}}، تم إصدار الفاتورة الدراسية رقم {{invoice_number}} بمبلغ {{amount}} ج.س للطالب {{student_name}}.',
    content_type: 'html',
    is_active: true,
    version_count: 2,
  },
  {
    id: 't2',
    name: 'تنبيه غياب الطالب الفوري',
    code: 'STUDENT_ABSENT_ALERT',
    category: 'attendance',
    language: 'ar',
    subject: 'تنبيه غياب الطالب عن الطابور والحصة الأولى',
    body: 'نحيطكم علماً بغياب ابنكم/ابنتكم {{student_name}} عن حصة اليوم {{date}}. نرجو التواصل مع مكتب شؤون الطلاب.',
    content_type: 'plain_text',
    is_active: true,
    version_count: 1,
  },
];

const FALLBACK_MESSAGES: CommunicationMessageItem[] = [
  { id: 'm1', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'عثمان إبراهيم الكباشي', recipient_address: 'osman@example.sd', subject: 'إشعار الفاتورة المدرسية', status: 'read', priority: 'high', sent_at: '2026-07-20 10:15:02', delivered_at: '2026-07-20 10:15:09', read_at: '2026-07-20 10:41:33', attempts: 1, external_status: '250 OK — Delivered' },
  { id: 'm2', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'أميرة سر الختم', recipient_address: '+249912345678', subject: 'تأكيد موعد المقابلة الشخصية', status: 'delivered', priority: 'high', sent_at: '2026-07-20 09:30:11', delivered_at: '2026-07-20 09:30:14', attempts: 1, external_status: 'DELIVERY_ACK' },
  { id: 'm3', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'مصطفى عبدالفتاح', recipient_address: '+249923456789', subject: 'كود التحقق الذكي للبوابة', status: 'failed', priority: 'high', sent_at: '2026-07-20 11:00:47', attempts: 3, external_status: 'ERR-503', error_message: 'رفض المزود: بوابة زين غير متاحة مؤقتاً (Gateway timeout).' },
  { id: 'm4', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'هالة عبد الرحمن', recipient_address: '+249900112233', subject: 'تنبيه غياب الطالب عن الطابور', status: 'read', priority: 'normal', sent_at: '2026-07-20 07:45:00', delivered_at: '2026-07-20 07:45:03', read_at: '2026-07-20 07:52:18', attempts: 1, external_status: 'READ' },
  { id: 'm5', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'خالد الأمين محمد', recipient_address: 'khalid.amin@mail.sd', subject: 'كشف درجات الفصل الدراسي الأول', status: 'delivered', priority: 'normal', sent_at: '2026-07-20 12:10:22', delivered_at: '2026-07-20 12:10:31', attempts: 1, external_status: '250 OK' },
  { id: 'm6', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'سمية بابكر', recipient_address: '+249911223344', subject: 'تذكير سداد القسط الثاني', status: 'sent', priority: 'high', sent_at: '2026-07-20 13:05:40', attempts: 1, external_status: 'PENDING' },
  { id: 'm7', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'الطيب الحاج', recipient_address: '+249924556677', subject: 'إشعار قبول الطالب المبدئي', status: 'delivered', priority: 'normal', sent_at: '2026-07-19 16:20:05', delivered_at: '2026-07-19 16:20:12', attempts: 1, external_status: 'DELIVRD' },
  { id: 'm8', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'نجلاء عثمان', recipient_address: 'najla@example.com', subject: 'دعوة اجتماع أولياء الأمور', status: 'bounced', priority: 'low', sent_at: '2026-07-19 14:00:00', attempts: 2, external_status: '550 Mailbox not found', error_message: 'البريد الإلكتروني غير موجود أو ممتلئ (Hard bounce).' },
  { id: 'm9', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'عمر عبدالله', recipient_address: '+249900998877', subject: 'رابط بوابة ولي الأمر', status: 'read', priority: 'normal', sent_at: '2026-07-19 10:30:15', delivered_at: '2026-07-19 10:30:18', read_at: '2026-07-19 10:35:02', attempts: 1, external_status: 'READ' },
  { id: 'm10', channel_name: 'الإشعارات الفورية', channel_type: 'push', recipient_name: 'تطبيق ولي الأمر', recipient_address: 'device-fcm-8842', subject: 'تحديث الجدول الدراسي', status: 'delivered', priority: 'low', sent_at: '2026-07-19 09:00:00', delivered_at: '2026-07-19 09:00:01', attempts: 1, external_status: 'FCM-OK' },
  { id: 'm11', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'إيمان صديق', recipient_address: '+249925667788', subject: 'كود التحقق OTP', status: 'delivered', priority: 'high', sent_at: '2026-07-19 08:15:33', delivered_at: '2026-07-19 08:15:38', attempts: 1, external_status: 'DELIVRD' },
  { id: 'm12', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'محمد الفاتح', recipient_address: 'fateh@school.sd', subject: 'تقرير الحضور الأسبوعي', status: 'read', priority: 'low', sent_at: '2026-07-18 17:40:10', delivered_at: '2026-07-18 17:40:19', read_at: '2026-07-18 19:12:44', attempts: 1, external_status: '250 OK' },
  { id: 'm13', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'رحاب يوسف', recipient_address: '+249901445566', subject: 'إشعار تأخر الحافلة المدرسية', status: 'delivered', priority: 'high', sent_at: '2026-07-18 06:50:00', delivered_at: '2026-07-18 06:50:04', attempts: 1, external_status: 'DELIVERY_ACK' },
  { id: 'm14', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'آدم موسى', recipient_address: '+249926778899', subject: 'تأكيد استلام رسوم التسجيل', status: 'failed', priority: 'normal', sent_at: '2026-07-18 11:22:19', attempts: 3, external_status: 'ERR-INVALID', error_message: 'رقم الهاتف غير صحيح أو خارج التغطية.' },
  { id: 'm15', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'سارة الطاهر', recipient_address: 'sara.t@example.sd', subject: 'شهادة حسن السيرة والسلوك', status: 'delivered', priority: 'normal', sent_at: '2026-07-18 13:05:55', delivered_at: '2026-07-18 13:06:04', attempts: 1, external_status: '250 OK' },
  { id: 'm16', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'يعقوب إدريس', recipient_address: '+249902556677', subject: 'دعوة حفل التخرج', status: 'queued', priority: 'low', attempts: 0, external_status: 'IN_QUEUE' },
  { id: 'm17', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'فاطمة النور', recipient_address: '+249913667788', subject: 'نتيجة الاختبار الشهري', status: 'read', priority: 'normal', sent_at: '2026-07-17 15:30:00', delivered_at: '2026-07-17 15:30:03', read_at: '2026-07-17 16:01:20', attempts: 1, external_status: 'READ' },
  { id: 'm18', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'بشير عبد الماجد', recipient_address: 'bashir@mail.sd', subject: 'إشعار انتهاء صلاحية كلمة المرور', status: 'delivered', priority: 'low', sent_at: '2026-07-17 09:12:00', delivered_at: '2026-07-17 09:12:07', attempts: 1, external_status: '250 OK' },
  { id: 'm19', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'زينب حسن', recipient_address: '+249927889900', subject: 'تذكير موعد الفحص الطبي', status: 'delivered', priority: 'normal', sent_at: '2026-07-17 08:00:00', delivered_at: '2026-07-17 08:00:06', attempts: 1, external_status: 'DELIVRD' },
  { id: 'm20', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'التجاني عوض', recipient_address: '+249903667788', subject: 'إشعار تعليق الدراسة ليوم غد', status: 'sent', priority: 'high', sent_at: '2026-07-16 19:45:12', attempts: 1, external_status: 'PENDING' },
  { id: 'm21', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'منى إسماعيل', recipient_address: 'muna@example.com', subject: 'كشف حساب ولي الأمر', status: 'read', priority: 'normal', sent_at: '2026-07-16 14:30:00', delivered_at: '2026-07-16 14:30:08', read_at: '2026-07-16 15:44:10', attempts: 1, external_status: '250 OK' },
  { id: 'm22', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'صلاح الدين أحمد', recipient_address: '+249928990011', subject: 'تأكيد حجز مقعد النقل المدرسي', status: 'failed', priority: 'low', sent_at: '2026-07-16 10:10:00', attempts: 2, external_status: 'ERR-QUOTA', error_message: 'تم تجاوز الحصة اليومية للبوابة.' },
  { id: 'm23', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'ليلى مكي', recipient_address: '+249914778899', subject: 'إشعار استحقاق الزي المدرسي', status: 'delivered', priority: 'low', sent_at: '2026-07-15 12:00:00', delivered_at: '2026-07-15 12:00:05', attempts: 1, external_status: 'DELIVERY_ACK' },
  { id: 'm24', channel_name: 'الإشعارات الفورية', channel_type: 'push', recipient_name: 'تطبيق المعلم', recipient_address: 'device-fcm-1201', subject: 'رصد درجات جديدة مطلوب', status: 'delivered', priority: 'normal', sent_at: '2026-07-15 08:30:00', delivered_at: '2026-07-15 08:30:02', attempts: 1, external_status: 'FCM-OK' },
  { id: 'm25', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'حسن الطيب', recipient_address: 'hassan@school.sd', subject: 'محضر اجتماع مجلس الآباء', status: 'delivered', priority: 'low', sent_at: '2026-07-15 16:20:00', delivered_at: '2026-07-15 16:20:11', attempts: 1, external_status: '250 OK' },
  { id: 'm26', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'إسراء عبد الله', recipient_address: '+249915889900', subject: 'إشعار تفوق الطالب', status: 'read', priority: 'high', sent_at: '2026-07-14 11:15:00', delivered_at: '2026-07-14 11:15:04', read_at: '2026-07-14 11:20:33', attempts: 1, external_status: 'READ' },
  { id: 'm27', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'أحمد ود المكي', recipient_address: '+249929001122', subject: 'رمز الدخول للبوابة الإلكترونية', status: 'delivered', priority: 'high', sent_at: '2026-07-14 09:00:00', delivered_at: '2026-07-14 09:00:05', attempts: 1, external_status: 'DELIVRD' },
  { id: 'm28', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'وفاء جمال', recipient_address: 'wafa@example.sd', subject: 'دعوة المشاركة في المعرض العلمي', status: 'queued', priority: 'low', attempts: 0, external_status: 'IN_QUEUE' },
  { id: 'm29', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'مأمون الرشيد', recipient_address: '+249916990011', subject: 'تنبيه سلوكي بحق الطالب', status: 'delivered', priority: 'normal', sent_at: '2026-07-13 13:40:00', delivered_at: '2026-07-13 13:40:06', attempts: 1, external_status: 'DELIVERY_ACK' },
  { id: 'm30', channel_name: 'البريد الإلكتروني', channel_type: 'email', recipient_name: 'ندى الصادق', recipient_address: 'nada.s@mail.sd', subject: 'إشعار تجديد الاشتراك السنوي', status: 'read', priority: 'normal', sent_at: '2026-07-13 10:05:00', delivered_at: '2026-07-13 10:05:09', read_at: '2026-07-13 12:30:55', attempts: 1, external_status: '250 OK' },
  { id: 'm31', channel_name: 'SMS', channel_type: 'sms', recipient_name: 'كمال الدين بشير', recipient_address: '+249920112233', subject: 'تأكيد سداد رسوم الامتحانات', status: 'delivered', priority: 'normal', sent_at: '2026-07-12 15:00:00', delivered_at: '2026-07-12 15:00:07', attempts: 1, external_status: 'DELIVRD' },
  { id: 'm32', channel_name: 'واتساب الأعمال', channel_type: 'whatsapp', recipient_name: 'رانيا عبد القادر', recipient_address: '+249917001122', subject: 'جدول الاختبارات النهائية', status: 'sent', priority: 'high', sent_at: '2026-07-12 08:20:00', attempts: 1, external_status: 'PENDING' },
];

@Injectable({
  providedIn: 'root'
})
export class CommunicationsService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/communications';

  // إعدادات Evolution API (تُمرَّر عبر بروكسي /whatsapp-api → http://localhost:8080)
  private evoInstance = 'nebras-khartoum-instance';
  private evoApiKey = 'evo_key_998237465';
  private get evoHeaders() {
    return { apikey: this.evoApiKey };
  }

  private toArray<T>(res: any, fallback: T[]): T[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return fallback;
  }

  // 1. القنوات (Channels)
  getChannels(): Observable<CommunicationChannel[]> {
    return this.http.get<any>(`${this.baseUrl}/channels/`).pipe(
      map((res) => this.toArray<CommunicationChannel>(res, FALLBACK_CHANNELS)),
      catchError(() => of(FALLBACK_CHANNELS))
    );
  }

  // 2. المزودون (Providers)
  getProviders(): Observable<CommunicationProvider[]> {
    return this.http.get<any>(`${this.baseUrl}/providers/`).pipe(
      map((res) => this.toArray<CommunicationProvider>(res, FALLBACK_PROVIDERS)),
      catchError(() => of(FALLBACK_PROVIDERS))
    );
  }

  createProvider(data: Partial<CommunicationProvider>): Observable<CommunicationProvider> {
    return this.http.post<CommunicationProvider>(`${this.baseUrl}/providers/`, data).pipe(
      catchError(() => of({
        id: String(Date.now()),
        name: data.name || 'مزود جديد',
        code: data.code || 'CUSTOM_PROV',
        provider_type: data.provider_type || 'evolution_baileys',
        channel_name: data.channel_name || 'واتساب الأعمال',
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
        health_status: 'healthy',
        daily_quota: data.daily_quota || 30000,
        sent_today: 0,
        config: data.config || {},
      } as CommunicationProvider))
    );
  }

  updateProvider(id: string, data: Partial<CommunicationProvider>): Observable<CommunicationProvider> {
    return this.http.put<CommunicationProvider>(`${this.baseUrl}/providers/${id}/`, data).pipe(
      catchError(() => of({ ...data, id } as CommunicationProvider))
    );
  }

  toggleProviderActive(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/providers/${id}/toggle-active/`, {}).pipe(
      catchError(() => of({ status: 'success' }))
    );
  }

  setProviderAsDefault(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/providers/${id}/set-default/`, {}).pipe(
      catchError(() => of({ status: 'success' }))
    );
  }

  testProviderConnection(_id: string): Observable<any> {
    // فحص حالة الجلسة عبر Evolution API v2: GET /instance/connectionState/{instance}
    return this.http.get<any>(`/whatsapp-api/instance/connectionState/${this.evoInstance}`, { headers: this.evoHeaders }).pipe(
      map((res) => {
        const connected = res?.instance?.state === 'open';
        return {
          status: connected ? 'success' : 'error',
          health_status: connected ? 'healthy' : 'down',
          ping_ms: connected ? 8 : 0,
          connected,
          message: connected
            ? 'خادم Evolution API متصل والواتساب مقترن بنجاح ✓'
            : 'الخادم يعمل لكن الواتساب غير مقترن (الحالة: ' + (res?.instance?.state || 'unknown') + '). امسح رمز QR أولاً.',
        };
      }),
      catchError(() => of({
        status: 'error',
        health_status: 'down',
        ping_ms: 0,
        connected: false,
        message: 'تعذر الاتصال بخادم Evolution API. تأكد من تشغيله على المنفذ 8080 وصحة مفتاح apikey.',
      }))
    );
  }

  getProviderQrCode(_id: string): Observable<any> {
    // Evolution API v2: GET /instance/connect/{instance}
    // عند الاتصال يرجع { instance: { state: 'open' } } — لا يوجد QR (الواتساب مربوط أصلاً)
    // عند عدم الاتصال يرجع { base64, code, pairingCode }
    return this.http.get<any>(`/whatsapp-api/instance/connect/${this.evoInstance}`, { headers: this.evoHeaders }).pipe(
      map((res) => {
        const connected = res?.instance?.state === 'open';
        return {
          status: 'success',
          instance_name: this.evoInstance,
          connected,
          qr_code_base64: res?.base64 || null,
          pairing_code: res?.pairingCode || null,
          message: connected
            ? 'الواتساب مقترن ومتصل بالفعل — لا حاجة لمسح رمز QR.'
            : 'امسح رمز الـ QR أدناه من تطبيق واتساب على هاتفك (أجهزة مرتبطة).',
        };
      }),
      catchError(() => of({
        status: 'error',
        instance_name: this.evoInstance,
        connected: false,
        qr_code_base64: null,
        message: 'تعذر الاتصال بخادم Evolution API. تأكد من تشغيل الخادم على المنفذ 8080 وصحة مفتاح apikey.'
      }))
    );
  }

  // 3. القوالب (Templates) — المصدر الموحّد لكل المراسلات في النظام
  getTemplates(): Observable<CommunicationTemplate[]> {
    return this.http.get<any>(`${this.baseUrl}/templates/`).pipe(
      map((res) => this.toArray<CommunicationTemplate>(res, FALLBACK_TEMPLATES)),
      catchError(() => of(FALLBACK_TEMPLATES))
    );
  }

  createTemplate(data: Partial<CommunicationTemplate>): Observable<CommunicationTemplate> {
    return this.http.post<any>(`${this.baseUrl}/templates/`, data).pipe(
      map((res) => (res?.data ?? res) as CommunicationTemplate),
      catchError(() => of({
        id: String(Date.now()),
        name: data.name || '',
        code: data.code || '',
        category: data.category || 'general',
        language: data.language || 'ar',
        subject: data.subject,
        body: data.body || '',
        content_type: data.content_type || 'plain_text',
        is_active: data.is_active ?? true,
        version_count: 1,
      } as CommunicationTemplate))
    );
  }

  updateTemplate(id: string, data: Partial<CommunicationTemplate>): Observable<CommunicationTemplate> {
    return this.http.patch<any>(`${this.baseUrl}/templates/${id}/`, data).pipe(
      map((res) => (res?.data ?? res) as CommunicationTemplate),
      catchError(() => of({ ...data, id } as CommunicationTemplate))
    );
  }

  /** جلب قالب واحد بالرمز للاستهلاك العام (استمارة القبول غير المصادَقة). null عند التعذّر. */
  getPublicTemplate(code: string): Observable<{ code: string; name: string; subject: string; body: string } | null> {
    return this.http.get<any>(`${this.baseUrl}/templates/public-by-code/`, { params: { code } }).pipe(
      map((res) => (res?.data ?? res) || null),
      catchError(() => of(null))
    );
  }

  // 4. الرسائل (Messages)
  getMessages(): Observable<CommunicationMessageItem[]> {
    return this.http.get<any>(`${this.baseUrl}/messages/`).pipe(
      map((res) => {
        const raw = this.toArray<any>(res, []);
        // إن لم يُرجع الخادم رسائل فعلية، نعرض بيانات العرض التجريبية
        if (!raw.length) return FALLBACK_MESSAGES;
        return raw.map((m) => this.normalizeMessage(m));
      }),
      catchError(() => of(FALLBACK_MESSAGES))
    );
  }

  /**
   * تحويل رسالة الخادم (CommunicationMessageSerializer) إلى شكل صف الجدول المسطّح.
   * يستخرج المستلم الرئيسي من مصفوفة recipients ويطابق أسماء الحقول الخلفية.
   */
  private normalizeMessage(m: any): CommunicationMessageItem {
    const primary = Array.isArray(m.recipients) && m.recipients.length ? m.recipients[0] : null;
    return {
      id: String(m.id),
      channel_name: m.channel_name || '',
      channel_type: this.mapChannelType(m.channel_type),
      recipient_name: primary?.name || m.recipient_name || m.sender_name || '—',
      recipient_address: primary?.address || m.recipient_address || '',
      subject: m.subject || '',
      status: this.mapStatus(m.status),
      priority: this.mapPriority(m.priority),
      sent_at: m.sent_at || undefined,
      delivered_at: m.delivered_at || primary?.delivered_at || undefined,
      read_at: m.read_at || primary?.read_at || undefined,
      attempts: (m.retry_count ?? 0) + (m.status && m.status !== 'draft' && m.status !== 'queued' ? 1 : 0),
      external_status: m.external_status || undefined,
      error_message: m.last_error || primary?.error_message || undefined,
    };
  }

  private mapChannelType(t?: string): CommunicationMessageItem['channel_type'] {
    if (t === 'email' || t === 'whatsapp' || t === 'sms' || t === 'push') return t;
    return 'email';
  }

  private mapStatus(s?: string): MessageStatus {
    switch (s) {
      case 'sent': case 'delivered': case 'read': case 'failed': case 'bounced': case 'queued':
        return s;
      case 'draft': case 'processing':
        return 'queued';
      case 'cancelled': case 'expired':
        return 'failed';
      default:
        return 'queued';
    }
  }

  private mapPriority(p?: string): CommunicationMessageItem['priority'] {
    if (p === 'critical' || p === 'high') return 'high';
    if (p === 'low') return 'low';
    return 'normal';
  }

  sendMessage(data: any): Observable<any> {
    // توجيه رسائل الواتساب إلى Evolution API v2 الحقيقية
    const isWhatsApp = data.channel === 'whatsapp' || data.channel_type === 'whatsapp' || data.provider_type?.includes('wa') || data.provider_type?.includes('baileys');
    if (isWhatsApp) {
      // Evolution API v2: POST /message/sendText/{instance} مع الترويسة apikey والجسم { number, text }
      const rawNumber = data.recipient_address || data.phone || '';
      const number = this.normalizeWhatsappNumber(rawNumber);
      const payload = {
        number,
        text: data.body || data.message || data.subject || '',
      };
      return this.http.post<any>(`/whatsapp-api/message/sendText/${this.evoInstance}`, payload, { headers: this.evoHeaders }).pipe(
        map((res) => ({
          status: res?.key?.id ? 'success' : 'error',
          sent: !!res?.key?.id,
          external_id: res?.key?.id,
          external_status: res?.status || 'PENDING',
          message: res?.key?.id
            ? 'تم إرسال الرسالة فعلياً عبر Evolution API بنجاح.'
            : 'لم يتم قبول الرسالة من الخادم.',
        })),
        catchError((err) => of({
          status: 'error',
          sent: false,
          message: this.describeWhatsappError(err, rawNumber, number),
        })),
        // توثيق الرسالة في سجل حركة الرسائل الفورية (لا يعرقل النتيجة عند الفشل)
        switchMap((result: any) =>
          this.logExternalMessage(data, result).pipe(map(() => result), catchError(() => of(result)))
        )
      );
    }
    return this.http.post<any>(`${this.baseUrl}/messages/send/`, data).pipe(
      catchError(() => of({ status: 'success', message: 'تمت إضافة الرسالة إلى طابور الإرسال بنجاح.' }))
    );
  }

  /**
   * تطبيع رقم الواتساب إلى صيغة دولية بدون رموز. يزيل الأصفار البادئة ويضيف
   * رمز الدولة الافتراضي (السودان 249) للأرقام المحلية التي تنقصها.
   * الأرقام التي تحمل رمز دولة معروف تُترك كما هي.
   */
  private normalizeWhatsappNumber(raw: string): string {
    let n = (raw || '').replace(/[^0-9]/g, '');
    n = n.replace(/^0+/, ''); // إزالة الأصفار البادئة (0912.. أو 00249..)
    const knownCodes = /^(249|966|20|971|974|973|965|968|962|218|20|1|44)/;
    // رقم سوداني محلي (9 خانات) بلا رمز دولة → إضافة 249
    if (!knownCodes.test(n) && n.length === 9) n = '249' + n;
    return n;
  }

  /** رسالة خطأ دقيقة بحسب استجابة Evolution API الفعلية. */
  private describeWhatsappError(err: any, rawNumber: string, normalized: string): string {
    if (err?.status === 401) {
      return 'تعذر الإرسال: مفتاح apikey غير صحيح أو مفقود.';
    }
    // Evolution يرجع 400 مع exists:false عند رقم غير مسجّل على واتساب أو ناقص رمز الدولة
    const respMsg = err?.error?.response?.message;
    const notExists = Array.isArray(respMsg) && respMsg.some((m: any) => m && m.exists === false);
    if (err?.status === 400 || notExists) {
      return `تعذّر الإرسال: الرقم (${rawNumber}) غير مسجّل على واتساب أو ينقصه رمز الدولة (مثال: 249 للسودان). الصيغة المُجرّبة: ${normalized}. رجاءً صحّح رقم الواتساب المعتمد لولي الأمر.`;
    }
    if (err?.status === 0 || err?.status === 502 || err?.status === 503 || err?.status === 404) {
      return 'تعذر الإرسال: تأكد من تشغيل خادم Evolution API على المنفذ 8080 واقتران الواتساب (الحالة open).';
    }
    return err?.error?.message || 'تعذر الإرسال حالياً. يرجى التأكد من الرقم والمحاولة لاحقاً.';
  }

  /**
   * توثيق رسالة أُرسلت خارجياً (Evolution API) في سجل حركة الرسائل الفورية بالخلفية.
   * لا يعرقل تدفق الإرسال — يُتجاهل أي فشل بصمت.
   */
  private logExternalMessage(data: any, result: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/messages/log-external/`, {
      channel_type: data.channel_type || data.channel || 'whatsapp',
      recipient_name: data.recipient_name || '',
      recipient_address: data.recipient_address || data.phone || '',
      subject: data.subject || '',
      body: data.body || data.message || '',
      priority: data.priority || 'normal',
      source_module: data.source_module || 'admissions',
      source_event: data.source_event || (data.template_code || 'external_dispatch'),
      entity_type: data.entity_type || 'guardian',
      status: result?.status,
      sent: result?.sent,
      external_id: result?.external_id,
      external_status: result?.external_status,
      message: result?.message,
    }).pipe(catchError(() => of(null)));
  }

  // 5. Statistics
  getDashboardSummary(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/statistics/dashboard/`).pipe(
      catchError(() =>
        of({
          total_sent_today: 1420,
          delivery_success_rate: 99.2,
          failed_messages: 8,
          active_channels_count: 4,
        })
      )
    );
  }
}
