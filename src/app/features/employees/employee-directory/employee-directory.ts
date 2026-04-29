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

  // --- HIGH CONTRAST AVATARS ---
  getAvatarClass(name: string): string {
    if (!name) return 'bg-gray-100 text-gray-600 border border-gray-200 shadow-sm';
    
    const styles = [
      'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200', 
      'bg-gradient-to-br from-teal-500 to-green-500 text-white shadow-md shadow-teal-200',
      'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-200', 
      'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200',
      'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-200'
    ];
    const index = name.charCodeAt(0) % styles.length;
    return styles[index];
  }

  // --- BULLETPROOF STATUS PILLS ---
  getStatusClasses(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge-active';
      case 'PROBATION': return 'badge-probation';
      case 'ON_LEAVE': return 'badge-leave';
      case 'TERMINATED': return 'badge-terminated';
      default: return 'badge-default';
    }
  }

  // Normal addition triggered by the standard "Add Employee" button
  openOnboardModal() {
    this.onboardModal.open();
  }
}