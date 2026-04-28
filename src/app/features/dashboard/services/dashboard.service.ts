import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';

export interface AdminSummary {
  // KPIs
  totalEmployees: number;
  newHiresThisMonth: number;
  presentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  activePayCycles: number;
  
  // Chart Data
  departmentDistribution: { departmentName: string; employeeCount: number }[];
  attendanceTrend: { date: string; presentRate: number }[]; // Last 7 days
  
  // Quick Actions Lists
  recentPendingLeaves: { id: number; employeeName: string; leaveTypeName: string; daysRequested: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(BaseApiService);

  getAdminSummary(): Observable<AdminSummary> {
    return this.api.get<AdminSummary>('/dashboard/admin-summary');
  }

  getSystemHealth(): Observable<{ status: string }> {
    return this.api.get<{ status: string }>('/health'); // Standard Spring Boot health endpoint
  }
}