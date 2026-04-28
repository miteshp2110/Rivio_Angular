import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { BaseApiService } from '../../../core/services/base-api.service';

export interface AttendanceRecord {
  id: number;
  employeeProfileId: number;
  employeeName: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  status?: string; 
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private api = inject(BaseApiService);

  // --- Daily & History ---
  getDailyAttendance(date: string): Observable<AttendanceRecord[]> {
    return this.api.get<AttendanceRecord[]>(`/attendance?date=${date}`);
  }

  getEmployeeHistory(empId: number, startDate: string, endDate: string): Observable<AttendanceRecord[]> {
    return this.api.get<AttendanceRecord[]>(`/attendance/employee/${empId}/history?startDate=${startDate}&endDate=${endDate}`);
  }

  // --- Manual Punching ---
  manualPunchIn(payload: any, userId: number): Observable<any> {
    // The API documentation requires the X-User-Id header for manual punches
    const headers = new HttpHeaders().set('X-User-Id', userId.toString());
    return this.api.post('/attendance', payload);
  }

  manualPunchOut(id: number, punchOutTime: string): Observable<any> {
    return this.api.patch(`/attendance/${id}/punch-out`, { punchOut: punchOutTime });
  }

  // --- Bulk CSV Upload ---
  downloadTemplate(): void {
    // Opens the download link in a new tab
    window.open(`${this.api['baseUrl']}/attendance/upload/template`, '_blank');
  }

  uploadCsv(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Important: Ensure your BaseApiService does NOT force 'Content-Type': 'application/json' 
    // when the payload is a FormData object, otherwise the backend will reject it.
    return this.api.post('/attendance/upload', formData);
  }
}