import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private fb = inject(FormBuilder);

  activeTab = signal<ActiveTab>('DAILY');
  isLoading = signal(false);
  isSubmitting = signal(false);

  // Daily & History State
  dailyDate = signal<Date>(new Date());
  dailyRecords = signal<AttendanceRecord[]>([]);
  historyRecords = signal<AttendanceRecord[]>([]);
  employees = signal<{label: string, value: number}[]>([]);
  selectedEmployee = signal<number | null>(null);
  historyDateRange = signal<Date[]>([ new Date(new Date().setDate(1)), new Date() ]);

  // Modals & Upload State
  isManualPunchModalOpen = signal(false);
  isUploadModalOpen = signal(false);
  selectedFile = signal<File | null>(null);
  uploadResult = signal<any>(null);

  // NEW: Advanced Punch State
  modalMode = signal<ModalMode>('ADD');
  editRecordId = signal<number | null>(null);
  isAbsent = signal<boolean>(false);

  punchForm = this.fb.group({
    employeeProfileId: [null as number | null, Validators.required],
    date: [new Date(), Validators.required],
    punchIn: [null as Date | null],
    punchOut: [null as Date | null]
  });

  ngOnInit() {
    this.loadEmployees();
    this.loadDailyAttendance();
  }

  loadEmployees() {
    this.employeeService.getEmployees(0, 1000).subscribe(res => {
      this.employees.set(res.content.map((e: any) => ({ 
        label: `${e.employeeCode} - ${e.firstName} ${e.lastName}`, 
        value: e.id 
      })));
    });
  }

  loadDailyAttendance() {
    this.isLoading.set(true);
    const dateStr = this.formatDateForApi(this.dailyDate());
    this.attendanceService.getDailyAttendance(dateStr).subscribe({
      next: (data) => { this.dailyRecords.set(data || []); this.isLoading.set(false); },
      error: () => { this.dailyRecords.set([]); this.isLoading.set(false); }
    });
  }

  loadHistory() {
    const range = this.historyDateRange();
    if (!this.selectedEmployee() || !range || !range[0] || !range[1]) return;
    this.isLoading.set(true);
    const startStr = this.formatDateForApi(range[0]);
    const endStr = this.formatDateForApi(range[1]);
    this.attendanceService.getEmployeeHistory(this.selectedEmployee()!, startStr, endStr).subscribe({
      next: (data) => { this.historyRecords.set(data || []); this.isLoading.set(false); },
      error: () => { this.historyRecords.set([]); this.isLoading.set(false); }
    });
  }

  // --- Manual Punching (ADD & EDIT) ---
  
  openManualPunch() {
    this.modalMode.set('ADD');
    this.editRecordId.set(null);
    this.isAbsent.set(false);
    this.punchForm.reset({ date: new Date(), punchIn: null, punchOut: null });
    
    // Ensure form is unlocked
    this.punchForm.get('employeeProfileId')?.enable();
    this.punchForm.get('date')?.enable();
    
    this.isManualPunchModalOpen.set(true);
  }

  openEditPunch(record: AttendanceRecord) {
    this.modalMode.set('EDIT');
    this.editRecordId.set(record.id);
    this.isAbsent.set(false);

    // Assuming the API returns the employee ID in the record. If not, match it by name.
    const empId = record.employeeProfileId || this.employees().find(e => e.label.includes(record.employeeName))?.value;

    this.punchForm.patchValue({
      employeeProfileId: empId,
      date: new Date(record.date),
      punchIn: record.punchIn ? new Date(record.punchIn) : null,
      punchOut: record.punchOut ? new Date(record.punchOut) : null
    });

    // Lock the ID and Date fields since PATCH only updates the punch out time
    this.punchForm.get('employeeProfileId')?.disable();
    this.punchForm.get('date')?.disable();

    this.isManualPunchModalOpen.set(true);
  }

  submitManualPunch() {
    if (this.punchForm.invalid) return;
    const raw = this.punchForm.getRawValue();

    this.isSubmitting.set(true);

    // FLOW A: Updating an existing record's punch-out time
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
    } 
    // FLOW B: Creating a brand new record
    else {
      // Validation: Must have at least one punch, OR be marked absent
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

      const currentUserId = 1; // Assuming acting admin user ID is 1 for now

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

  // --- Bulk Upload (Unchanged) ---
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

  // --- Formatters (Unchanged) ---
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
      case 'LEAVE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HOLIDAY': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}