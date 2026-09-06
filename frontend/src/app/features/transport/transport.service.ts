import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface TransportStats {
  total_vehicles: number;
  active_trips: number;
  total_drivers: number;
  failed_inspections: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransportService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/transport';

  stats = signal<TransportStats | null>(null);
  loading = signal<boolean>(false);

  getDashboardStats(): Observable<TransportStats> {
    this.loading.set(true);
    return this.http.get<TransportStats>(`${this.apiUrl}/trips/dashboard-stats/`).pipe(
      tap({
        next: (data) => this.stats.set(data),
        finalize: () => this.loading.set(false)
      })
    );
  }

  getVehicles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vehicles/`);
  }

  getDrivers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/drivers/`);
  }

  getRoutes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/routes/`);
  }

  getTrips(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trips/`);
  }

  startTrip(tripId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/start/`, {});
  }

  completeTrip(tripId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/complete/`, {});
  }

  recordAttendance(tripId: string, passengerId: string, status: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/attendance/`, {
      passenger_id: passengerId,
      status: status
    });
  }

  recordFuelTransaction(vehicleId: string, payload: {
    station_id: string;
    liters: number;
    cost: number;
    odometer: number;
    debit_gl_account_id: string;
    credit_gl_account_id: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehicles/${vehicleId}/fuel/`, payload);
  }

  recordInspection(vehicleId: string, status: string, notes?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehicles/${vehicleId}/inspect/`, {
      status,
      notes
    });
  }

  getLiveFleet(): Observable<{ active_count: number; fleet: any[] }> {
    return this.http.get<{ active_count: number; fleet: any[] }>(`${this.apiUrl}/trips/live-fleet/`);
  }

  getTripLiveTracking(tripId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trips/${tripId}/live-tracking/`);
  }

  sendGpsTelemetry(tripId: string, coords: { latitude: number; longitude: number; speed_kmh?: number; heading?: number; battery_level?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/trips/${tripId}/telemetry/`, coords);
  }

  getRentalAgreements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rental-agreements/`);
  }

  createRentalAgreement(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rental-agreements/`, payload);
  }

  getRentalPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rental-payments/`);
  }

  markRentalPaymentPaid(paymentId: string, referenceNumber: string, paymentMethod = 'bankak'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rental-payments/${paymentId}/mark-paid/`, {
      reference_number: referenceNumber,
      payment_method: paymentMethod
    });
  }
}
