import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService, Department, Designation, Location } from '../services/company.service';
import { EmployeeService } from '../../employees/services/employee.service'; // <-- Import Employee Service

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

type ActiveTab = 'DEPARTMENTS' | 'DESIGNATIONS' | 'LOCATIONS';
type ModalMode = 'ADD' | 'EDIT';

@Component({
  selector: 'app-company-structure',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, IconFieldModule, InputIconModule, DialogModule, SelectModule
  ],
  templateUrl: './company-structure.component.html'
})
export class CompanyStructureComponent implements OnInit {
  @ViewChild('dt') table!: Table; 
  
  private companyService = inject(CompanyService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  // Core State
  activeTab = signal<ActiveTab>('DEPARTMENTS');
  isLoading = signal(false);
  globalSearch = signal('');

  // Data Signals
  departments = signal<Department[]>([]);
  designations = signal<Designation[]>([]);
  locations = signal<Location[]>([]);
  managers = signal<{label: string, value: number}[]>([]); // For Dept Manager dropdown

  // Common Dropdown Options for Locations
  currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD'];
  timezones = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney'];

  // Filtering State
  selectedDeptFilter = signal<number | null>(null);
  displayedDesignations = computed(() => {
    const filter = this.selectedDeptFilter();
    if (!filter) return this.designations();
    return this.designations().filter(d => d.departmentId === filter);
  });

  // Modal & Action State
  isFormModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  modalMode = signal<ModalMode>('ADD');
  selectedItemId = signal<number | null>(null);
  isSubmitting = signal(false);

  // Updated Forms
  deptForm = this.fb.nonNullable.group({ 
    name: ['', Validators.required],
    managerUserId: [null as number | null] // New Field
  });
  
  locForm = this.fb.nonNullable.group({ 
    name: ['', Validators.required],
    currencyCode: ['INR', Validators.required], // New Field
    timezone: ['Asia/Kolkata', Validators.required] // New Field
  });
  
  roleForm = this.fb.nonNullable.group({ 
    title: ['', Validators.required],
    departmentId: [null as number | null, Validators.required] 
  });

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
    this.companyService.getDepartments().subscribe(data => this.departments.set(data));

    if (this.activeTab() === 'DEPARTMENTS') {
      this.companyService.getDepartments().subscribe({
        next: (data) => { this.departments.set(data); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    } else if (this.activeTab() === 'DESIGNATIONS') {
      this.companyService.getDesignations().subscribe({
        next: (data) => { this.designations.set(data); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    } else if (this.activeTab() === 'LOCATIONS') {
      this.companyService.getLocations().subscribe({
        next: (data) => { this.locations.set(data); this.isLoading.set(false); },
        error: () => this.isLoading.set(false)
      });
    }
  }

  loadManagers() {
    // Fetch employees to populate the Department Manager dropdown
    this.employeeService.getEmployees(0, 1000).subscribe(res => {
      const mapped = res.content.map((emp: any) => ({
        label: `${emp.firstName} ${emp.lastName} (${emp.email})`,
        value: emp.userId || emp.id // Assuming manager is linked by userId
      }));
      this.managers.set(mapped);
    });
  }

  onGlobalFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (this.table) this.table.filterGlobal(value, 'contains');
  }

  // --- ADD / EDIT MODAL LOGIC ---
  openAddModal() {
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
    
    if (this.activeTab() === 'DEPARTMENTS') {
      this.deptForm.patchValue({ 
        name: item.name, 
        managerUserId: item.managerUserId || null 
      });
    } else if (this.activeTab() === 'DESIGNATIONS') {
      this.roleForm.patchValue({ 
        title: item.title, 
        departmentId: item.departmentId 
      });
    } else if (this.activeTab() === 'LOCATIONS') {
      this.locForm.patchValue({ 
        name: item.name,
        currencyCode: item.currencyCode || 'INR',
        timezone: item.timezone || 'Asia/Kolkata'
      });
    }
    this.isFormModalOpen.set(true);
  }

  submitForm() {
    let payload: any;
    let apiCall: any;
    const mode = this.modalMode();
    const id = this.selectedItemId();
    const tab = this.activeTab();

    if (tab === 'DEPARTMENTS' && this.deptForm.valid) {
      payload = this.deptForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createDepartment(payload) : this.companyService.updateDepartment(id!, payload);
    } else if (tab === 'DESIGNATIONS' && this.roleForm.valid) {
      payload = this.roleForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createDesignation(payload) : this.companyService.updateDesignation(id!, payload);
    } else if (tab === 'LOCATIONS' && this.locForm.valid) {
      payload = this.locForm.getRawValue();
      apiCall = mode === 'ADD' ? this.companyService.createLocation(payload) : this.companyService.updateLocation(id!, payload);
    } else {
      return; 
    }

    this.isSubmitting.set(true);
    apiCall.subscribe({
      next: () => {
        this.isFormModalOpen.set(false);
        this.isSubmitting.set(false);
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // --- DELETE MODAL LOGIC ---
  openDeleteModal(id: number) {
    this.selectedItemId.set(id);
    this.isDeleteModalOpen.set(true);
  }

  confirmDelete() {
    this.isSubmitting.set(true);
    const id = this.selectedItemId()!;
    let apiCall = this.activeTab() === 'DEPARTMENTS' ? this.companyService.deleteDepartment(id) :
                  this.activeTab() === 'DESIGNATIONS' ? this.companyService.deleteDesignation(id) :
                  this.companyService.deleteLocation(id);

    apiCall.subscribe({
      next: () => {
        this.isDeleteModalOpen.set(false);
        this.isSubmitting.set(false);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.message || 'Cannot delete this record. It is likely mapped to active employees.');
      }
    });
  }
}