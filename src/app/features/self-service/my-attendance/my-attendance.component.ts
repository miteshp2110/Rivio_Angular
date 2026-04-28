import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';

import { MyAttendanceService, MyAttendanceRecord } from './services/my-attendance.service';
import { CompanyService } from '../../company/services/company.service';
import { AuthState } from '../../../core/state/auth.state';

// PrimeNG
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

export interface DailyLog {
  date: Date;
  dateStr: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  record?: MyAttendanceRecord;
  uiStatus: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'OFF_DAY' | 'NO_RECORD';
}

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, SelectModule],
  templateUrl: './my-attendance.component.html'
})
export class MyAttendanceComponent implements OnInit {
  private attendanceService = inject(MyAttendanceService);
  private companyService = inject(CompanyService);
  private authState = inject(AuthState);

  currentEmployeeId = this.authState.employeeProfileId() || 5; // Using 5 to match your Bill Gates JSON
  
  isLoading = signal(true);
  monthlyLog = signal<DailyLog[]>([]);

  // Filter State
  currentDate = new Date();
  selectedMonth = signal<number>(this.currentDate.getMonth() + 1); 
  selectedYear = signal<number>(this.currentDate.getFullYear());

  months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 },
    { label: 'March', value: 3 }, { label: 'April', value: 4 },
    { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 },
    { label: 'September', value: 9 }, { label: 'October', value: 10 },
    { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];

  years = [
    { label: '2024', value: 2024 }, { label: '2025', value: 2025 },
    { label: '2026', value: 2026 }, { label: '2027', value: 2027 }
  ];

  totalDaysInMonth = computed(() => new Date(this.selectedYear(), this.selectedMonth(), 0).getDate());
  
  totalWorkingDays = computed(() => this.monthlyLog().filter(log => log.isWorkingDay && !log.isHoliday).length);
  totalPresent = computed(() => this.monthlyLog().filter(log => log.uiStatus === 'PRESENT').length);
  totalAbsent = computed(() => this.monthlyLog().filter(log => log.uiStatus === 'ABSENT').length);
  totalLeaves = computed(() => this.monthlyLog().filter(log => log.uiStatus === 'LEAVE').length);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    
    // Calculate start and end date strings for the API
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(this.totalDaysInMonth()).padStart(2, '0')}`;

    forkJoin({
      records: this.attendanceService.getMonthlyAttendance(this.currentEmployeeId, startDate, endDate).pipe(catchError(() => of([]))),
      workDays: this.companyService.getWorkDays().pipe(catchError(() => of([]))),
      holidays: this.companyService.getHolidays().pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        this.buildMonthlyCalendar(res.records || [], res.workDays || [], res.holidays || []);
      }
    });
  }

  buildMonthlyCalendar(apiRecords: MyAttendanceRecord[], apiWorkDays: any[], apiHolidays: any[]) {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const daysInMonth = this.totalDaysInMonth();
    
    const dayMap: Record<string, number> = { 'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6 };
    const nonWorkingDays: number[] = [];
    apiWorkDays.forEach(wd => {
      if (wd && wd.dayOfWeek && !wd.isWorkingDay) {
        nonWorkingDays.push(dayMap[wd.dayOfWeek.toUpperCase()]);
      }
    });

    const holidayMap = new Map<string, string>();
    apiHolidays.forEach(h => {
      if (h && h.date) holidayMap.set(h.date, h.name || 'Holiday');
    });

    const recordMap = new Map<string, MyAttendanceRecord>();
    apiRecords.forEach(r => {
      if (r && r.date) recordMap.set(r.date, r);
    });

    const generatedLog: DailyLog[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month - 1, i);
      const dateStr = this.formatDateForApi(currentDate);
      const dayOfWeek = currentDate.getDay();

      const isWorkingDay = !nonWorkingDays.includes(dayOfWeek);
      const isHoliday = holidayMap.has(dateStr);
      const backendRecord = recordMap.get(dateStr);

      let status: DailyLog['uiStatus'] = 'NO_RECORD';

      if (backendRecord) {
        status = backendRecord.status; 
      } else if (isHoliday) {
        status = 'HOLIDAY';
      } else if (!isWorkingDay) {
        status = 'OFF_DAY';
      } else if (currentDate < today) {
        status = 'ABSENT'; 
      }

      generatedLog.push({
        date: currentDate,
        dateStr: dateStr,
        isWorkingDay: isWorkingDay,
        isHoliday: isHoliday,
        holidayName: holidayMap.get(dateStr),
        record: backendRecord,
        uiStatus: status
      });
    }

    this.monthlyLog.set(generatedLog.reverse());
  }

  // --- UTILS ---
  formatDateForApi(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // NEW: Calculates hours dynamically from ISO strings
  calculateEffectiveHours(punchIn: string | null | undefined, punchOut: string | null | undefined): string {
    if (!punchIn || !punchOut) return '-';
    
    const start = new Date(punchIn).getTime();
    const end = new Date(punchOut).getTime();
    
    if (isNaN(start) || isNaN(end)) return '-';

    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  getStatusClass(status: DailyLog['uiStatus']): string {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200';
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'LEAVE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HOLIDAY': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OFF_DAY': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-200 border-dashed';
    }
  }
  
  getStatusLabel(log: DailyLog): string {
    if (log.uiStatus === 'OFF_DAY') return 'Weekend / Off';
    if (log.uiStatus === 'NO_RECORD') return 'Pending';
    return log.uiStatus;
  }
}