import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators'; // <-- Added catchError

import { LeaveService, LeaveBalance, LeaveRequest, LeaveType } from '../../leave/services/leave.service';
import { CompanyService } from '../../company/services/company.service';


// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { AuthState } from '../../../core/state/auth.state';

@Component({
  selector: 'app-employee-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, SelectModule, DatePickerModule],
  templateUrl: './employee-leaves.component.html'
})
export class EmployeeLeavesComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private companyService = inject(CompanyService);
  private authState = inject(AuthState);
  private fb = inject(FormBuilder);

  currentEmployeeId = this.authState.employeeProfileId() || 10; 
  currentYear = new Date().getFullYear();

  isLoading = signal(true);
  isSubmitting = signal(false);
  isApplyModalOpen = signal(false);

  // Data State
  balances = signal<LeaveBalance[]>([]);
  history = signal<LeaveRequest[]>([]);
  leaveTypes = signal<LeaveType[]>([]);

  // Smart Calendar State
  minDate = new Date(); // Prevents applying in the past
  disabledDates: Date[] = []; // Specific Holidays
  disabledDays: number[] = [0, 6]; // Default to Weekends (Sun=0, Sat=6) until fetched
  
  // Validation State
  insufficientBalance = signal(false);
  selectedLeaveBalance = signal(0);

  applyForm = this.fb.group({
    leaveTypeId: new FormControl<number | null>(null, Validators.required),
    dateRange: new FormControl<Date[] | null>(null, Validators.required),
    daysRequested: new FormControl<number>(0, [Validators.required, Validators.min(0.5)]) // Kept in form, removed from HTML
  });

  ngOnInit() {
    this.loadData();

    // Auto-calculate requested days when the date range changes (skipping holidays & weekends)
    this.applyForm.controls.dateRange.valueChanges.subscribe((range: Date[] | null) => {
      if (range && range[0]) {
        const start = range[0];
        const end = range[1] || range[0];
        const calculatedDays = this.calculateWorkingDays(start, end);
        this.applyForm.patchValue({ daysRequested: calculatedDays }, { emitEvent: false });
        this.checkBalance(); 
      } else {
        this.applyForm.patchValue({ daysRequested: 0 }, { emitEvent: false });
      }
    });

    // Re-verify balance if they change the leave type
    this.applyForm.controls.leaveTypeId.valueChanges.subscribe(() => this.checkBalance());
  }

  loadData() {
    this.isLoading.set(true);
    
    forkJoin({
      balances: this.leaveService.getEmployeeBalances(this.currentEmployeeId, this.currentYear).pipe(catchError(() => of([]))),
      history: this.leaveService.getEmployeeLeaveRequests(this.currentEmployeeId).pipe(catchError(() => of([]))),
      leaveTypes: this.leaveService.getLeaveTypes().pipe(catchError(() => of([]))),
      workDays: this.companyService.getWorkDays().pipe(catchError(() => of([]))),
      holidays: this.companyService.getHolidays().pipe(catchError(() => of([])))
    }).pipe(
      // BULLETPROOF: finalize ALWAYS runs when the stream completes or errors out
      finalize(() => this.isLoading.set(false)) 
    ).subscribe({
      next: (res) => {
        this.balances.set(res.balances || []);
        
        // Safely sort history
        const sortedHistory = (res.history || []).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        this.history.set(sortedHistory);
        
        this.leaveTypes.set(res.leaveTypes || []);

        // Process schedule (now wrapped in safety checks below)
        this.processCompanySchedule(res.workDays, res.holidays);
      }
    });
  }

  processCompanySchedule(workDays: any[], holidays: any[]) {
    // Safely map Holidays (skipping any malformed data from DB)
    this.disabledDates = (holidays || []).map(h => {
      if (!h || !h.date) return null;
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d;
    }).filter(d => d !== null) as Date[];

    // Safely map Work Days
    if (workDays && workDays.length > 0) {
      const dayMap: Record<string, number> = { 'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6 };
      const nonWorkingDays: number[] = [];
      
      workDays.forEach(wd => {
        // Strict null check added here
        if (wd && wd.dayOfWeek && !wd.isWorkingDay) {
          const index = dayMap[wd.dayOfWeek.toUpperCase()];
          if (index !== undefined) nonWorkingDays.push(index);
        }
      });
      this.disabledDays = nonWorkingDays;
    } else {
      // Default to weekends if no DB config is found
      this.disabledDays = [0, 6]; 
    }
  }

  // Iterates through selected range and ONLY counts valid working days
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isWeekend = this.disabledDays.includes(dayOfWeek);
      const isHoliday = this.disabledDates.some(d => d.getTime() === current.getTime());
      
      // If it's NOT a non-working day and NOT a holiday, add 1 to requested days
      if (!isWeekend && !isHoliday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  checkBalance() {
    const typeId = this.applyForm.get('leaveTypeId')?.value;
    const requested = this.applyForm.get('daysRequested')?.value || 0;

    if (typeId && requested > 0) {
      const typeName = this.leaveTypes().find(t => t.id === typeId)?.name;
      const balanceRecord = this.balances().find(b => b.leaveTypeName === typeName);
      
      const available = balanceRecord ? balanceRecord.balance : 0;
      this.selectedLeaveBalance.set(available);
      
      this.insufficientBalance.set(requested > available);
    } else {
      this.insufficientBalance.set(false);
    }
  }

  openApplyModal() {
    this.applyForm.reset({ daysRequested: 0 });
    this.insufficientBalance.set(false);
    this.isApplyModalOpen.set(true);
  }

  submitLeaveRequest() {
    if (this.applyForm.invalid || this.insufficientBalance()) return;
    
    const raw = this.applyForm.getRawValue();
    if (raw.daysRequested === 0) {
      alert("You cannot submit a request for 0 working days.");
      return;
    }

    this.isSubmitting.set(true);
    const range = raw.dateRange!;

    const payload: LeaveRequest = {
      employeeProfileId: this.currentEmployeeId,
      leaveTypeId: raw.leaveTypeId!,
      startDate: this.formatDateForApi(range[0]),
      endDate: this.formatDateForApi(range[1] || range[0]), 
      daysRequested: raw.daysRequested!
    };

    this.leaveService.applyForLeave(payload).subscribe({
      next: () => {
        this.isApplyModalOpen.set(false);
        this.isSubmitting.set(false);
        this.loadData();
        alert('Leave request submitted successfully!');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.message || 'Failed to submit leave request.');
      }
    });
  }

  withdrawRequest(id: number) {
    if (confirm('Are you sure you want to withdraw this pending leave request?')) {
      this.leaveService.withdrawLeaveRequest(id).subscribe({
        next: () => this.loadData(),
        error: () => alert('Failed to withdraw request.')
      });
    }
  }

  formatDateForApi(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getStatusClass(status?: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'WITHDRAWN': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}