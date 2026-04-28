import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';

// Matches your exact backend JSON response
export interface PayrollComponent {
  id?: number;
  employeeProfileId: number;
  employeeName?: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  value: number;
}

export interface PayCycle {
  id: number;
  cycleName: string;
  fromDate: string;
  toDate: string;
  status: 'DRAFT' | 'PROCESSING' | 'FINALIZED' | 'PAID';
}

export interface Payslip {
  id: number;
  payCycleId: number;
  // --- NEW / UPDATED FIELDS FROM BACKEND ---
  cycleName: string; 
  cycleFromDate: string;
  cycleToDate: string;
  cycleStatus: string;
  // -----------------------------------------
  employeeProfileId: number;
  employeeName: string;
  employeeCode: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  
  // Optional arrays for the detailed PDF view (if backend supports them later)
  earnings?: { name: string, value: number }[];
  deductions?: { name: string, value: number }[];
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private api = inject(BaseApiService);

  // --- 1. Employee Salary Components ---
  getAllSalaryComponents(): Observable<PayrollComponent[]> { return this.api.get<PayrollComponent[]>('/salary-components'); }
  createSalaryComponent(payload: Partial<PayrollComponent>): Observable<PayrollComponent> { return this.api.post<PayrollComponent>(`/salary-components/employee/${payload.employeeProfileId}`, payload); }
  updateSalaryComponent(id: number, payload: Partial<PayrollComponent>): Observable<PayrollComponent> { return this.api.put<PayrollComponent>(`/salary-components/${id}`, payload); }
  deleteSalaryComponent(id: number): Observable<void> { return this.api.delete<void>(`/salary-components/${id}`); }

  // --- 2. Pay Cycles ---
  getPayCycles(): Observable<PayCycle[]> { return this.api.get<PayCycle[]>('/pay-cycles'); }
  createPayCycle(payload: Partial<PayCycle>): Observable<PayCycle> { return this.api.post<PayCycle>('/pay-cycles', payload); }
  processPayCycle(id: number): Observable<any> { return this.api.post(`/pay-cycles/${id}/generate-payslips`, {}); }

  // --- 3. Payslips ---
  getPayslipsForCycle(cycleId: number): Observable<Payslip[]> { return this.api.get<Payslip[]>(`/pay-cycles/${cycleId}/payslips`); }



  // ADD THIS LINE BACK IN:
  getEmployeePayslipHistory(empId: number): Observable<Payslip[]> { 
    return this.api.get<Payslip[]>(`/employees/${empId}/payslips`); 
  }
  updatePayCycleStatus(id: number, status: 'DRAFT' | 'PROCESSING' | 'FINALIZED' | 'PAID'): Observable<PayCycle> { 
    return this.api.put<PayCycle>(`/pay-cycles/${id}/status`, { status }); 
  }
}