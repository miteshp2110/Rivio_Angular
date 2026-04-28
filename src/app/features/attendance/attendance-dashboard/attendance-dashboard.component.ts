import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttendanceService, AttendanceRecord } from '../services/attendance.service';
import { EmployeeService } from '../../employees/services/employee.service';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

type ActiveTab = 'DAILY' | 'HISTORY';
type ModalMode = 'ADD' | 'EDIT';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DatePickerModule, DialogModule, SelectModule],
  templateUrl: './attendance-dashboard.component.html'
})
export class AttendanceDashboardComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  private employeeService = inject(EmployeeService);

  activeTab = signal<ActiveTab>('DAILY');
  isLoading = signal(false);
  isSubmitting = signal(false);

  // Daily & History State
  dailyDate = signal<Date>(new Date());
  dailyRecords = signal<AttendanceRecord[]>([]);
  historyRecords = signal<AttendanceRecord[]>([]);
  employees = signal<{label: string, value: number}[]>([]);
  selectedEmployee = signal<number | null>(null);
  
  // Start of month to today
  historyDateRange = signal<Date[]>([ new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date() ]);

  // Modals & Upload State
  isManualPunchModalOpen = signal(false);
  isUploadModalOpen = signal(false);
  selectedFile = signal<File | null>(null);
  uploadResult = signal<any>(null);

  // Advanced Punch State
  modalMode = signal<ModalMode>('ADD');
  editRecordId = signal<number | null>(null);
  isAbsent = signal<boolean>(false);

  punchForm = new FormGroup({
    employeeProfileId: new FormControl<number | null>(null, Validators.required),
    date: new FormControl<Date>(new Date(), { nonNullable: true, validators: Validators.required }),
    punchIn: new FormControl<Date | null>(null),
    punchOut: new FormControl<Date | null>(null)
  });

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.employeeService.getEmployees(0, 1000).subscribe({
      next: (res) => {
        this.employees.set(res.content.map((e: any) => ({ 
          label: `${e.employeeCode} - ${e.firstName} ${e.lastName}`, 
          value: e.id 
        })));
        // Load daily attendance only after employees are loaded (for the cross-reference merge)
        this.loadDailyAttendance();
      }
    });
  }

  loadDailyAttendance() {
    if (this.employees().length === 0) return; // Wait until employee list is ready
    
    this.isLoading.set(true);
    const dateStr = this.formatDateForApi(this.dailyDate());
    const isPastDate = new Date(this.dailyDate()).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
    
    this.attendanceService.getDailyAttendance(dateStr).subscribe({
      next: (apiData) => {
        const records = apiData || [];
        
        // SMART MERGE: Ensure every employee is listed. If missing, mark as ABSENT.
        const mergedDaily = this.employees().map(emp => {
          // Check if API returned a record for this employee
          const existingRecord = records.find((r: any) => 
            r.employeeProfileId === emp.value || r.employeeName === emp.label.split(' - ')[1]
          );

          if (existingRecord) return existingRecord;

          // If no record exists, generate a dummy record
          return {
            id: null,
            employeeProfileId: emp.value,
            employeeName: emp.label.substring(emp.label.indexOf('-') + 2).trim(),
            date: dateStr,
            punchIn: null,
            punchOut: null,
            // Automatically assign ABSENT if it's a past date and they didn't punch in
            status: isPastDate ? 'ABSENT' : 'NO RECORD'
          } as unknown as AttendanceRecord;
        });

        this.dailyRecords.set(mergedDaily);
        this.isLoading.set(false);
      },
      error: () => { 
        this.dailyRecords.set([]); 
        this.isLoading.set(false); 
      }
    });
  }

  loadHistory() {
    const range = this.historyDateRange();
    if (!this.selectedEmployee() || !range || !range[0] || !range[1]) return;
    
    this.isLoading.set(true);
    const startStr = this.formatDateForApi(range[0]);
    const endStr = this.formatDateForApi(range[1]);
    
    this.attendanceService.getEmployeeHistory(this.selectedEmployee()!, startStr, endStr).subscribe({
      next: (data) => { 
        this.historyRecords.set(data || []); 
        this.isLoading.set(false); 
      },
      error: () => { 
        this.historyRecords.set([]); 
        this.isLoading.set(false); 
      }
    });
  }

  // --- Manual Punching (ADD & EDIT) ---
  openManualPunch() {
    this.modalMode.set('ADD');
    this.editRecordId.set(null);
    this.isAbsent.set(false);
    this.punchForm.reset({ date: new Date(), punchIn: null, punchOut: null });
    
    this.punchForm.get('employeeProfileId')?.enable();
    this.punchForm.get('date')?.enable();
    
    this.isManualPunchModalOpen.set(true);
  }

  openEditPunch(record: AttendanceRecord) {
    this.modalMode.set('EDIT');
    this.editRecordId.set(record.id);
    this.isAbsent.set(false);

    const empId = record.employeeProfileId || this.employees().find(e => e.label.includes(record.employeeName))?.value;

    this.punchForm.patchValue({
      employeeProfileId: empId,
      date: new Date(record.date),
      punchIn: record.punchIn ? new Date(record.punchIn) : null,
      punchOut: record.punchOut ? new Date(record.punchOut) : null
    });

    this.punchForm.get('employeeProfileId')?.disable();
    this.punchForm.get('date')?.disable();

    this.isManualPunchModalOpen.set(true);
  }

  submitManualPunch() {
    if (this.punchForm.invalid) return;
    const raw = this.punchForm.getRawValue();
    this.isSubmitting.set(true);

    if (this.modalMode() === 'EDIT' && this.editRecordId()) {
      if (!raw.punchOut) {
        alert("Please provide a Punch Out time to update the record.");
        this.isSubmitting.set(false);
        return;
      }
      const punchOutStr = this.formatDateTimeForApi(raw.date!, raw.punchOut);
      this.attendanceService.manualPunchOut(this.editRecordId()!, punchOutStr).subscribe({
        next: () => this.onPunchSuccess(),
        error: () => { alert("Failed to update punch out."); this.isSubmitting.set(false); }
      });
    } else {
      if (!this.isAbsent() && !raw.punchIn && !raw.punchOut) {
        alert("Please provide at least a Punch In time, or mark the employee as Absent.");
        this.isSubmitting.set(false);
        return;
      }

      const payload: any = {
        employeeProfileId: raw.employeeProfileId,
        date: this.formatDateForApi(raw.date!)
      };

      if (this.isAbsent()) {
        payload.punchIn = null;
        payload.punchOut = null;
      } else {
        if (raw.punchIn) payload.punchIn = this.formatDateTimeForApi(raw.date!, raw.punchIn);
        if (raw.punchOut) payload.punchOut = this.formatDateTimeForApi(raw.date!, raw.punchOut);
      }

      const currentUserId = 1; 
      this.attendanceService.manualPunchIn(payload, currentUserId).subscribe({
        next: () => this.onPunchSuccess(),
        error: () => { alert("Failed to submit manual punch."); this.isSubmitting.set(false); }
      });
    }
  }

  onPunchSuccess() {
    this.isManualPunchModalOpen.set(false);
    this.isSubmitting.set(false);
    this.loadDailyAttendance();
    if (this.activeTab() === 'HISTORY') this.loadHistory();
  }

  // --- Bulk Upload ---
  downloadTemplate() { this.attendanceService.downloadTemplate(); }
  onFileSelect(event: any) { if (event.target.files.length > 0) this.selectedFile.set(event.target.files[0]); }
  uploadCsv() {
    if (!this.selectedFile()) return;
    this.isSubmitting.set(true);
    this.attendanceService.uploadCsv(this.selectedFile()!).subscribe({
      next: (res) => { this.uploadResult.set(res); this.isSubmitting.set(false); this.loadDailyAttendance(); },
      error: () => this.isSubmitting.set(false)
    });
  }
  resetUploadModal() { this.isUploadModalOpen.set(false); this.uploadResult.set(null); this.selectedFile.set(null); }

  // --- Formatters & Helpers ---
  formatDateForApi(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatDateTimeForApi(baseDate: Date, timeObj: Date): string {
    const dateStr = this.formatDateForApi(baseDate);
    const hh = String(timeObj.getHours()).padStart(2, '0');
    const min = String(timeObj.getMinutes()).padStart(2, '0');
    const sec = String(timeObj.getSeconds()).padStart(2, '0');
    return `${dateStr}T${hh}:${min}:${sec}`;
  }

  getStatusClass(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    switch (status.toUpperCase()) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200';
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'LEAVE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HOLIDAY': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 border-dashed';
    }
  }

  // Helper to determine if an admin is allowed to edit a punch
  isActionAllowed(status?: string): boolean {
    if (!status) return true;
    const st = status.toUpperCase();
    // Cannot add a time-punch to a day they were officially Absent or on Leave
    return st !== 'ABSENT' && st !== 'LEAVE' && st !== 'HOLIDAY' && st !== 'NO RECORD';
  }
}