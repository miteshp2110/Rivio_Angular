import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../../core/services/base-api.service';

export interface MyAttendanceRecord {
  id?: number;
  date: string; 
  employeeName: string;
  punchIn: string | null;
  punchOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY'; 
}

@Injectable({ providedIn: 'root' })
export class MyAttendanceService {
  private api = inject(BaseApiService);

  getMonthlyAttendance(empId: number, startDate: string, endDate: string): Observable<MyAttendanceRecord[]> {
    return this.api.get<MyAttendanceRecord[]>(`/attendance/employee/${empId}/history?startDate=${startDate}&endDate=${endDate}`);
  }
}