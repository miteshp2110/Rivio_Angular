import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { BaseApiService } from '../../../core/services/base-api.service';
import { AuthState } from '../../../core/state/auth.state';

export interface LeaveType {
  id: number;
  name: string;
  yearlyAllotment: number;
  carryForwardLimit: number;
}

export interface LeaveBalance {
  id: number;
  leaveTypeName: string;
  year: number;
  allotted: number;
  consumed: number;
  balance: number;
}

export interface LeaveRequest {
  id?: number;
  employeeProfileId: number;
  employeeName?: string;
  leaveTypeId: number;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private api = inject(BaseApiService);
  private authState = inject(AuthState)

  // --- Leave Types (Settings) ---
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.api.get<LeaveType[]>('/leave-types');
  }
  createLeaveType(payload: Partial<LeaveType>): Observable<LeaveType> {
    return this.api.post<LeaveType>('/leave-types', payload);
  }
  updateLeaveType(id: number, payload: Partial<LeaveType>): Observable<LeaveType> {
    return this.api.put<LeaveType>(`/leave-types/${id}`, payload);
  }
  deleteLeaveType(id: number): Observable<void> {
    return this.api.delete<void>(`/leave-types/${id}`);
  }

  // --- Leave Balances ---
  allocateBalances(year: number): Observable<any> {
    return this.api.post('/leave-balances/allocate', { year });
  }
  getEmployeeBalances(empId: number, year?: number): Observable<LeaveBalance[]> {
    const url = year ? `/employees/${empId}/leave-balances?year=${year}` : `/employees/${empId}/leave-balances`;
    return this.api.get<LeaveBalance[]>(url);
  }

  // --- Leave Requests (Employee & Admin) ---
  getEmployeeLeaveRequests(empId: number): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>(`/employees/${empId}/leave-requests`);
  }
  
  // NOTE: For the admin dashboard to see ALL pending requests, 
  // you might need a general GET /leave-requests endpoint from the backend. 
  // Assuming it exists based on standard REST patterns:
  getAllLeaveRequests(empId: number): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>(`${this.authState.role()==='Super Admin'?`/leave-requests/pending`:`/leave-requests/pending/${empId}`}`);
  }

  applyForLeave(payload: LeaveRequest): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>('/leave-requests', payload);
  }
  withdrawLeaveRequest(id: number): Observable<void> {
    return this.api.delete<void>(`/leave-requests/${id}`);
  }
  
  // Admin Approval
  updateLeaveStatus(id: number, status: 'APPROVED' | 'REJECTED', managerId: number): Observable<any> {
    const headers = new HttpHeaders().set('X-Manager-Id', managerId.toString());
    return this.api.put(`/leave-status-updates/${id}`, { status });
  }
}