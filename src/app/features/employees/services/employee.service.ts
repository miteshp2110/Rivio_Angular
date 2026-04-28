import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';

// 1. Used specifically for the Paginated Directory Table
export interface EmployeeListItem {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;             // Note: Directory API uses 'email'
  departmentName: string;
  designationName: string;   // Note: Directory API uses 'designationName'
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';
}

// 2. Used specifically for the Full Profile View
export interface EmployeeProfile {
  id: number;
  userId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  userEmail: string;         // Note: Profile API uses 'userEmail'
  phoneNo: string | null;
  bankAccount: string | null;
  departmentId: number;
  departmentName: string;
  designationId: number;
  designationTitle: string;  // Note: Profile API uses 'designationTitle'
  locationId: number;
  locationName: string;
  managerId: number | null;
  managerName: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';
  joiningDate: string;
  employmentType: string;
  salaryComponents: ProfileSalaryComponent[];
}

// 3. Used specifically to strictly type the Edit Form payload
export interface EmployeeUpdatePayload {
  phoneNo?: string | null;
  bankAccount?: string | null;
  departmentId?: number | null;
  designationId?: number | null;
  locationId?: number | null;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface BasicInfoUpdatePayload {
  phoneNo?: string | null;
  bankAccount?: string | null;
}

export interface JobDetailsUpdatePayload {
  departmentId?: number | null;
  designationId?: number | null;
  locationId?: number | null;
  reportsToProfileId?: number | null;
}

export interface StatusUpdatePayload {
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';
  exitDate?: string;
}

export interface LeaveBalance {
  id: number;
  leaveTypeName: string;
  allotted: number;
  consumed: number;
  balance: number;
  year: number;
}
export interface ProfileSalaryComponent {
  id: number;
  employeeProfileId: number;
  employeeName: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  value: number;
}


@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private api = inject(BaseApiService);

  // Uses EmployeeListItem
  getEmployees(page: number = 0, size: number = 10): Observable<PaginatedResponse<EmployeeListItem>> {
    return this.api.get<PaginatedResponse<EmployeeListItem>>(`/employees?page=${page}&size=${size}`);
  }

  // Uses EmployeeProfile
  getEmployeeById(id: number): Observable<EmployeeProfile> {
    return this.api.get<EmployeeProfile>(`/employees/${id}`);
  }

  createEmployee(payload: any): Observable<any> {
    return this.api.post<any>('/employees', payload);
  }

  // Uses EmployeeUpdatePayload
  updateEmployee(id: number, payload: EmployeeUpdatePayload): Observable<EmployeeProfile> {
    return this.api.put<EmployeeProfile>(`/employees/${id}/job-details`, payload);
  }
  updateBasicInfo(id: number, payload: BasicInfoUpdatePayload): Observable<any> {
    return this.api.patch(`/employees/${id}/basic-info`, payload);
  }

  updateJobDetails(id: number, payload: JobDetailsUpdatePayload): Observable<any> {
    return this.api.put(`/employees/${id}/job-details`, payload);
  }

  updateStatus(id: number, payload: StatusUpdatePayload): Observable<any> {
    return this.api.put(`/employees/${id}/status`, payload);
  }

  // NEW: Leave Balances
  getLeaveBalances(id: number): Observable<LeaveBalance[]> {
    return this.api.get<LeaveBalance[]>(`/employees/${id}/leave-balances`);
  }

  getEmployeeProfile(id: number) {
  // Assuming your BaseApiService returns the unwrapped 'data' object
  return this.api.get<EmployeeProfile>(`/employees/${id}`); 
}
}