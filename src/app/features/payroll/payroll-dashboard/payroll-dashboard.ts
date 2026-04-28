import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { PayrollService, PayrollComponent, PayCycle, Payslip } from '../services/payroll.service';
import { EmployeeService } from '../../employees/services/employee.service';


// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';

type ActiveTab = 'SALARY' | 'PAY_CYCLES';
type ModalMode = 'ADD' | 'EDIT';

@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, SelectModule, InputTextModule, DatePickerModule],
  templateUrl: './payroll-dashboard.component.html'
})
export class PayrollDashboardComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  activeTab = signal<ActiveTab>('SALARY');
  isLoading = signal(true);
  isSubmitting = signal(false);

  // --- Salary Tab State ---
  employees = signal<{label: string, value: number}[]>([]);
  selectedEmpId = signal<number | null>(null);
  allComponents = signal<PayrollComponent[]>([]);
  
  // MAGIC FILTER: Automatically extracts components ONLY for the selected employee
  employeeComponents = computed(() => {
    const id = this.selectedEmpId();
    if (!id) return [];
    return this.allComponents().filter(c => c.employeeProfileId === id);
  });

  totalEarnings = computed(() => this.employeeComponents().filter(c => c.type === 'EARNING').reduce((sum, c) => sum + c.value, 0));
  totalDeductions = computed(() => this.employeeComponents().filter(c => c.type === 'DEDUCTION').reduce((sum, c) => sum + c.value, 0));

  // --- Pay Cycle Tab State ---
  payCycles = signal<PayCycle[]>([]);
  selectedCycle = signal<PayCycle | null>(null);
  cyclePayslips = signal<Payslip[]>([]);

  // --- Modals ---
  isComponentModalOpen = signal(false);
  isCycleModalOpen = signal(false);
  isPayslipsModalOpen = signal(false);
  modalMode = signal<ModalMode>('ADD');
  selectedComponentId = signal<number | null>(null);

  // --- Forms ---
  componentTypes = [
    { label: 'Earning (Adds to Gross Pay)', value: 'EARNING' },
    { label: 'Deduction (Subtracts from Pay)', value: 'DEDUCTION' }
  ];

  compForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['EARNING' as 'EARNING'|'DEDUCTION', Validators.required],
    value: [0, [Validators.required, Validators.min(1)]]
  });

  cycleForm = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    dateRange: new FormControl<Date[] | null>(null, Validators.required)
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    forkJoin({
      emps: this.employeeService.getEmployees(0, 1000).pipe(catchError(() => of({ content: [] }))),
      comps: this.payrollService.getAllSalaryComponents().pipe(catchError(() => of([]))),
      cycles: this.payrollService.getPayCycles().pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        // Map employees to Dropdown format
        this.employees.set(res.emps.content.map((e: any) => ({ 
          label: `${e.employeeCode} - ${e.firstName} ${e.lastName}`, 
          value: e.id 
        })));
        
        // Load all components
        this.allComponents.set(res.comps || []);
        
        // Sort Pay Cycles newest first
        const sortedCycles = (res.cycles || []).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
        this.payCycles.set(sortedCycles);
      }
    });
  }

  // --- SALARY COMPONENT ACTIONS ---
  openAddComponent() {
    if (!this.selectedEmpId()) return alert("Please select an employee first.");
    this.modalMode.set('ADD');
    this.selectedComponentId.set(null);
    this.compForm.reset({ type: 'EARNING', value: 0 });
    this.isComponentModalOpen.set(true);
  }

  openEditComponent(comp: PayrollComponent) {
    this.modalMode.set('EDIT');
    this.selectedComponentId.set(comp.id!);
    this.compForm.patchValue({ name: comp.name, type: comp.type, value: comp.value });
    this.isComponentModalOpen.set(true);
  }

  submitComponent() {
    if (this.compForm.invalid || !this.selectedEmpId()) return;
    this.isSubmitting.set(true);
    
    const payload: Partial<PayrollComponent> = {
      ...this.compForm.getRawValue(),
      employeeProfileId: this.selectedEmpId()!
    };

    const request = this.modalMode() === 'ADD' 
      ? this.payrollService.createSalaryComponent(payload)
      : this.payrollService.updateSalaryComponent(this.selectedComponentId()!, payload);

    request.subscribe({
      next: () => {
        this.isComponentModalOpen.set(false);
        this.isSubmitting.set(false);
        // Silently refresh components to update the UI
        this.payrollService.getAllSalaryComponents().subscribe(comps => this.allComponents.set(comps || []));
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  deleteComponent(id: number) {
    if (confirm("Are you sure you want to remove this salary component?")) {
      this.payrollService.deleteSalaryComponent(id).subscribe({
        next: () => this.payrollService.getAllSalaryComponents().subscribe(comps => this.allComponents.set(comps || [])),
        error: () => alert("Failed to delete component.")
      });
    }
  }

  // --- PAY CYCLE ACTIONS ---
  openCreateCycle() {
    this.cycleForm.reset();
    this.isCycleModalOpen.set(true);
  }

  // submitPayCycle() {
  //   if (this.cycleForm.invalid) return;
  //   this.isSubmitting.set(true);

  //   const raw = this.cycleForm.getRawValue();
  //   const range = raw.dateRange!;
    
  //   const payload = {
  //     name: raw.name,
  //     startDate: this.formatDate(range[0]),
  //     endDate: this.formatDate(range[1] || range[0])
  //   };

  //   this.payrollService.createPayCycle(payload).subscribe({
  //     next: () => {
  //       this.isCycleModalOpen.set(false);
  //       this.isSubmitting.set(false);
  //       this.payrollService.getPayCycles().subscribe(cycles => {
  //           const sortedCycles = (cycles || []).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  //           this.payCycles.set(sortedCycles);
  //       });
  //     },
  //     error: () => this.isSubmitting.set(false)
  //   });
  // }
  submitPayCycle() {
    if (this.cycleForm.invalid) return;
    this.isSubmitting.set(true);

    const raw = this.cycleForm.getRawValue();
    // Explicitly cast to Date[] to satisfy TypeScript
    const range = raw.dateRange as Date[]; 
    
    const payload = {
      cycleName: raw.name,
      fromDate: this.formatDate(range[0]),
      toDate: this.formatDate(range[1] || range[0])
    };

    this.payrollService.createPayCycle(payload).subscribe({
      next: () => {
        this.isCycleModalOpen.set(false);
        this.isSubmitting.set(false);
        this.payrollService.getPayCycles().subscribe(cycles => {
            const sortedCycles = (cycles || []).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.toDate).getTime());
            this.payCycles.set(sortedCycles);
        });
      },
      error: () => {
        alert("Failed to initialize pay cycle.");
        this.isSubmitting.set(false);
      }
    });
  }

  processCycle(id: number) {
    if (confirm("Are you sure you want to process this pay cycle? This will lock it and generate payslips.")) {
      this.isLoading.set(true);
      this.payrollService.processPayCycle(id).subscribe({
        next: () => {
            this.payrollService.getPayCycles().subscribe(cycles => {
                const sortedCycles = (cycles || []).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.toDate).getTime());
                this.payCycles.set(sortedCycles);
                this.isLoading.set(false);
            });
        },
        error: () => {
            alert("Failed to process pay cycle.");
            this.isLoading.set(false);
        }
      });
    }
  }

  changeCycleStatus(id: number, newStatus: 'PROCESSING' | 'FINALIZED' | 'PAID') {
    const message = newStatus === 'FINALIZED' 
      ? "Are you sure you want to finalize this cycle? Payslips will be locked."
      : "Are you sure you want to mark this cycle as PAID? This confirms funds are transferred.";

    if (confirm(message)) {
      this.isLoading.set(true);
      this.payrollService.updatePayCycleStatus(id, newStatus).subscribe({
        next: () => {
          this.payrollService.getPayCycles().subscribe(cycles => {
            const sortedCycles = (cycles || []).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.toDate).getTime());
            this.payCycles.set(sortedCycles);
            this.isLoading.set(false);
          });
        },
        error: () => {
          alert(`Failed to update pay cycle status to ${newStatus}.`);
          this.isLoading.set(false);
        }
      });
    }
  }

  viewPayslips(cycle: PayCycle) {
    this.selectedCycle.set(cycle);
    this.isLoading.set(true);
    this.payrollService.getPayslipsForCycle(cycle.id).subscribe({
      next: (slips) => {
        this.cyclePayslips.set(slips || []);
        this.isLoading.set(false);
        this.isPayslipsModalOpen.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        alert("Failed to load payslips for this cycle.");
      }
    });
  }

  formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}