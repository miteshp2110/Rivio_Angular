
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService, Department, Designation, Location, WorkDay, Holiday } from '../services/company.service';
import { EmployeeService } from '../../employees/services/employee.service';

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { LeaveService, LeaveType } from '../../leave/services/leave.service';
import { PayrollComponent, PayrollService } from '../../payroll/services/payroll.service';

type ActiveTab = 'DEPARTMENTS' | 'DESIGNATIONS' | 'LOCATIONS' | 'WORK_DAYS' | 'HOLIDAYS' | 'LEAVE_TYPES' | 'PAYROLL_COMPS';
type ModalMode = 'ADD' | 'EDIT';

@Component({
  selector: 'app-company-structure',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, IconFieldModule, InputIconModule, DialogModule, SelectModule, DatePickerModule
  ],
  templateUrl: './company-structure.component.html'
})
export class CompanyStructureComponent implements OnInit {
  @ViewChild('dt') table!: Table; 
  
  private companyService = inject(CompanyService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);
  private leaveService = inject(LeaveService);
  private payrollService = inject(PayrollService);
payrollComponents = signal<PayrollComponent[]>([]);

payrollCompForm = this.fb.nonNullable.group({
  name: ['', Validators.required],
  type: ['EARNING', Validators.required],
  calculationType: ['PERCENTAGE', Validators.required],
  value: [0, [Validators.required, Validators.min(0)]]
});

  // Core State
  activeTab = signal<ActiveTab>('DEPARTMENTS');
  isLoading = signal(false);
  globalSearch = signal('');

  // Data Signals
  departments = signal<Department[]>([]);
  designations = signal<Designation[]>([]);
  locations = signal<Location[]>([]);
  workDays = signal<WorkDay[]>([]);
  holidays = signal<Holiday[]>([]);
  managers = signal<{label: string, value: number}[]>([]); 

  // Location Dropdown Options
  currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD'];
  timezones = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney'];

  // Filtering State
  selectedDeptFilter = signal<number | null>(null);
  displayedDesignations = computed(() => {
    const filter = this.selectedDeptFilter();
    if (!filter) return this.designations();
    return this.designations().filter(d => d.departmentId === filter);
  });

  leaveTypes = signal<LeaveType[]>([]);
leaveTypeForm = this.fb.nonNullable.group({
  name: ['', Validators.required],
  yearlyAllotment: [0, [Validators.required, Validators.min(0)]],
  carryForwardLimit: [0, [Validators.required, Validators.min(0)]]
});

  // Modal State
  isFormModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isHolidayModalOpen = signal(false);
  modalMode = signal<ModalMode>('ADD');
  selectedItemId = signal<number | null>(null);
  isSubmitting = signal(false);

  // Forms
  deptForm = this.fb.nonNullable.group({ name: ['', Validators.required], managerUserId: [null as number | null] });
  locForm = this.fb.nonNullable.group({ name: ['', Validators.required], currencyCode: ['INR', Validators.required], timezone: ['Asia/Kolkata', Validators.required] });
  roleForm = this.fb.nonNullable.group({ title: ['', Validators.required], departmentId: [null as number | null, Validators.required] });
  holidayForm = this.fb.nonNullable.group({ name: ['', Validators.required], date: [new Date(), Validators.required] });

  ngOnInit() {
    this.loadData();
    this.loadManagers();
  }

  setTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    this.globalSearch.set('');
    this.selectedDeptFilter.set(null); 
    if (this.table) this.table.clear();
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    // Always load departments for dropdowns
    this.companyService.getDepartments().subscribe(data => this.departments.set(data));

    const tab = this.activeTab();
    if (tab === 'DEPARTMENTS') {
      this.companyService.getDepartments().subscribe({ next: (data) => { this.departments.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    } else if (tab === 'DESIGNATIONS') {
      this.companyService.getDesignations().subscribe({ next: (data) => { this.designations.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    } else if (tab === 'LOCATIONS') {
      this.companyService.getLocations().subscribe({ next: (data) => { this.locations.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    } else if (tab === 'WORK_DAYS') {
      this.companyService.getWorkDays().subscribe({ next: (data) => { this.workDays.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    } else if (tab === 'HOLIDAYS') {
      this.companyService.getHolidays().subscribe({ next: (data) => { this.holidays.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    } else if (tab === 'LEAVE_TYPES'){
      this.leaveService.getLeaveTypes().subscribe({ next: (data) => { this.leaveTypes.set(data); this.isLoading.set(false); }, error: () => this.isLoading.set(false) });
    }
    
    
    
  }

  loadManagers() {
    this.employeeService.getEmployees(0, 1000).subscribe(res => {
      this.managers.set(res.content.map((emp: any) => ({ label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`, value: emp.userId || emp.id })));
    });
  }

  onGlobalFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (this.table) this.table.filterGlobal(value, 'contains');
  }

  // --- Add/Edit Core Models ---
  openAddModal() {
    if (this.activeTab() === 'HOLIDAYS') {
      this.holidayForm.reset({ date: new Date() });
      this.isHolidayModalOpen.set(true);
      return;
    }
    if (this.activeTab() === 'LEAVE_TYPES') {
      this.leaveTypeForm.reset({ yearlyAllotment: 0, carryForwardLimit: 0 });
      this.isFormModalOpen.set(true);
      return;
    }
    this.modalMode.set('ADD');
    this.selectedItemId.set(null);
    this.deptForm.reset({ managerUserId: null });
    this.roleForm.reset({ departmentId: null });
    this.locForm.reset({ currencyCode: 'INR', timezone: 'Asia/Kolkata' });
    this.isFormModalOpen.set(true);
  }

  openEditModal(item: any) {
    this.modalMode.set('EDIT');
    this.selectedItemId.set(item.id);
    if (this.activeTab() === 'DEPARTMENTS') this.deptForm.patchValue({ name: item.name, managerUserId: item.managerUserId || null });
    else if (this.activeTab() === 'DESIGNATIONS') this.roleForm.patchValue({ title: item.title, departmentId: item.departmentId });
    else if (this.activeTab() === 'LOCATIONS') this.locForm.patchValue({ name: item.name, currencyCode: item.currencyCode || 'INR', timezone: item.timezone || 'Asia/Kolkata' });
    else if (this.activeTab() === 'LEAVE_TYPES') this.leaveTypeForm.patchValue(item);
    this.isFormModalOpen.set(true);
    this.isFormModalOpen.set(true);
  }

  submitForm() {
    let payload: any, apiCall: any;
    const mode = this.modalMode(), id = this.selectedItemId(), tab = this.activeTab();

    if (tab === 'DEPARTMENTS' && this.deptForm.valid) {
      payload = this.deptForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createDepartment(payload) : this.companyService.updateDepartment(id!, payload);
    } else if (tab === 'DESIGNATIONS' && this.roleForm.valid) {
      payload = this.roleForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createDesignation(payload) : this.companyService.updateDesignation(id!, payload);
    } else if (tab === 'LOCATIONS' && this.locForm.valid) {
      payload = this.locForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createLocation(payload) : this.companyService.updateLocation(id!, payload);
    } else if (tab === 'LEAVE_TYPES' && this.leaveTypeForm.valid) {
      payload = this.leaveTypeForm.getRawValue();
      apiCall = mode === 'ADD' ? this.leaveService.createLeaveType(payload) : this.leaveService.updateLeaveType(id!, payload);
    }
    else return;

    this.isSubmitting.set(true);
    apiCall.subscribe({ next: () => { this.isFormModalOpen.set(false); this.isSubmitting.set(false); this.loadData(); }, error: () => this.isSubmitting.set(false) });
  }

  // --- Work Days & Holidays specific logic ---
  toggleWorkDay(workDay: WorkDay) {
    this.companyService.updateWorkDay(workDay.id, !workDay.isWorkingDay).subscribe(() => this.loadData());
  }

  submitHoliday() {
    if (this.holidayForm.invalid) return;
    this.isSubmitting.set(true);
    const raw = this.holidayForm.getRawValue();
    const payload = { name: raw.name, date: raw.date.toISOString().split('T')[0] };
    
    this.companyService.createHoliday(payload).subscribe({
      next: () => { this.isHolidayModalOpen.set(false); this.isSubmitting.set(false); this.loadData(); },
      error: () => this.isSubmitting.set(false)
    });
  }

  // --- Deletion Logic ---
  openDeleteModal(id: number) { this.selectedItemId.set(id); this.isDeleteModalOpen.set(true); }

  confirmDelete() {
    this.isSubmitting.set(true);
    const id = this.selectedItemId()!;
    let apiCall = this.activeTab() === 'DEPARTMENTS' ? this.companyService.deleteDepartment(id) :
                  this.activeTab() === 'DESIGNATIONS' ? this.companyService.deleteDesignation(id) :
                  this.activeTab() === 'HOLIDAYS' ? this.companyService.deleteHoliday(id) :
                  this.companyService.deleteLocation(id);
                  this.activeTab() === 'LEAVE_TYPES' ? this.leaveService.deleteLeaveType(id) :
                  this.companyService.deleteLocation(id);

    apiCall.subscribe({
      next: () => { this.isDeleteModalOpen.set(false); this.isSubmitting.set(false); this.loadData(); },
      error: (err) => { this.isSubmitting.set(false); alert(err.error?.message || 'Cannot delete this record.'); }
    });
  }
}