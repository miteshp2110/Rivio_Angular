import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { AuthState } from '../../../core/state/auth.state';
// Update path to wherever your EmployeeService is
import { EmployeeService, EmployeeProfile } from '../../employees/services/employee.service'; 

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-profile.component.html'
})
export class MyProfileComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private authState = inject(AuthState);

  // Dynamically fetch the logged-in employee's profile ID
  currentEmployeeId = this.authState.employeeProfileId() || 5; // Fallback to 5 based on your JSON for testing
  
  isLoading = signal(true);
  profile = signal<EmployeeProfile | null>(null);

  // Dynamic Salary Calculations
  totalEarnings = computed(() => {
    const p = this.profile();
    if (!p || !p.salaryComponents) return 0;
    return p.salaryComponents.filter(c => c.type === 'EARNING').reduce((sum, c) => sum + c.value, 0);
  });

  totalDeductions = computed(() => {
    const p = this.profile();
    if (!p || !p.salaryComponents) return 0;
    return p.salaryComponents.filter(c => c.type === 'DEDUCTION').reduce((sum, c) => sum + c.value, 0);
  });

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading.set(true);
    this.employeeService.getEmployeeProfile(this.currentEmployeeId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.profile.set(data),
        error: () => {
          alert("Failed to load profile details.");
          this.profile.set(null);
        }
      });
  }

  // Helper to extract initials for the Avatar
  getInitials(first: string, last: string): string {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  }

  // UI Formatter
  formatEmploymentType(type?: string): string {
    if (!type) return 'N/A';
    return type.replace('_', ' ');
  }
}