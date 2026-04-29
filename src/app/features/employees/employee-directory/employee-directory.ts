// import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { RouterLink } from '@angular/router'; // <-- 1. Import RouterLink here
// import { EmployeeService, EmployeeListItem } from '../services/employee.service';

// import { EmployeeOnboardComponent } from '../employee-onboard/employee-onboard'; 

// // PrimeNG Imports
// import { TableModule } from 'primeng/table';
// import { ButtonModule } from 'primeng/button';
// import { InputTextModule } from 'primeng/inputtext';
// import { TagModule } from 'primeng/tag';
// import { TooltipModule } from 'primeng/tooltip';
// import { IconFieldModule } from 'primeng/iconfield';
// import { InputIconModule } from 'primeng/inputicon';

// @Component({
//   selector: 'app-employee-directory',
//   standalone: true,
//   imports: [
//     CommonModule, 
//     FormsModule, 
//     RouterLink, // <-- 2. Add it to the imports array here!
//     TableModule, 
//     ButtonModule, 
//     InputTextModule, 
//     TagModule, 
//     TooltipModule, 
//     IconFieldModule, 
//     InputIconModule, 
//     EmployeeOnboardComponent
//   ],
//   templateUrl: './employee-directory.html'
// })
// export class EmployeeDirectoryComponent implements OnInit {
//   @ViewChild(EmployeeOnboardComponent) onboardModal!: EmployeeOnboardComponent;
  
  
//   private employeeService = inject(EmployeeService);

//   employees = signal<EmployeeListItem[]>([]);
//   isLoading = signal(true);
//   globalFilterValue = signal('');

//   ngOnInit() {
//     this.loadEmployees();
//   }

//   loadEmployees() {
//     this.isLoading.set(true);
//     this.employeeService.getEmployees(0, 50).subscribe({
//       next: (res) => {
//         this.employees.set(res.content || (res as any)); 
//         this.isLoading.set(false);
//       },
//       error: (err) => {
//         console.error('Error fetching employees', err);
//         this.isLoading.set(false);
//       }
//     });
//   }

//   getAvatarClass(name: string): string {
//     if (!name) return 'bg-gray-200 text-gray-800';
//     const colors = [
//       'bg-blue-100 text-blue-800', 
//       'bg-teal-100 text-teal-800',
//       'bg-indigo-100 text-indigo-800', 
//       'bg-violet-100 text-violet-800',
//       'bg-cyan-100 text-cyan-800'
//     ];
//     const index = name.charCodeAt(0) % colors.length;
//     return colors[index];
//   }

//   getStatusClasses(status: string): string {
//     switch (status) {
//       case 'ACTIVE': return 'bg-green-100 text-green-800 border border-green-200';
//       case 'PROBATION': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
//       case 'ON_LEAVE': return 'bg-blue-100 text-blue-800 border border-blue-200';
//       case 'TERMINATED': return 'bg-red-100 text-red-800 border border-red-200';
//       default: return 'bg-gray-100 text-gray-800 border border-gray-200';
//     }
//   }

//   openOnboardModal() {
//     this.onboardModal.open();
//   }
// }


import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; 
import { EmployeeService, EmployeeListItem } from '../services/employee.service';

import { EmployeeOnboardComponent } from '../employee-onboard/employee-onboard'; 

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    TableModule, 
    ButtonModule, 
    InputTextModule, 
    TagModule, 
    TooltipModule, 
    IconFieldModule, 
    InputIconModule, 
    EmployeeOnboardComponent
  ],
  templateUrl: './employee-directory.html'
})
export class EmployeeDirectoryComponent implements OnInit {
  @ViewChild(EmployeeOnboardComponent) onboardModal!: EmployeeOnboardComponent;
  
  private employeeService = inject(EmployeeService);

  employees = signal<EmployeeListItem[]>([]);
  isLoading = signal(true);
  globalFilterValue = signal('');

  ngOnInit() {
    this.loadEmployees();

    // --- ATS INTEGRATION LOGIC ---
    // Check if we arrived here from the ATS "Hire Candidate" button
    const state = history.state;
    if (state && state.hireCandidateData) {
      
      // We must use setTimeout to wait 1 tick for the ViewChild to initialize
      setTimeout(() => {
        this.onboardModal.open(state.hireCandidateData);
        
        // Wipe the history state so refreshing doesn't re-open the modal maliciously
        window.history.replaceState({}, document.title);
      });
    }
  }

  loadEmployees() {
    this.isLoading.set(true);
    this.employeeService.getEmployees(0, 50).subscribe({
      next: (res) => {
        this.employees.set(res.content || (res as any)); 
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching employees', err);
        this.isLoading.set(false);
      }
    });
  }

  getAvatarClass(name: string): string {
    if (!name) return 'bg-gray-200 text-gray-800';
    const colors = [
      'bg-blue-100 text-blue-800', 
      'bg-teal-100 text-teal-800',
      'bg-indigo-100 text-indigo-800', 
      'bg-violet-100 text-violet-800',
      'bg-cyan-100 text-cyan-800'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border border-green-200';
      case 'PROBATION': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'ON_LEAVE': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'TERMINATED': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  // Normal addition triggered by the standard "Add Employee" button
  openOnboardModal() {
    this.onboardModal.open();
  }
}