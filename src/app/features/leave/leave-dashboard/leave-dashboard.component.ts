import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaveService, LeaveRequest, LeaveBalance } from '../services/leave.service';


// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AuthState } from '../../../core/state/auth.state';

@Component({
  selector: 'app-leave-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DialogModule, InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './leave-dashboard.component.html'
})
export class LeaveDashboard implements OnInit {
  private leaveService = inject(LeaveService);
  private authState = inject(AuthState);

  isLoading = signal(true);
  isActionLoading = signal(false);
  
  // Data State
  pendingRequests = signal<LeaveRequest[]>([]);
  requestHistory = signal<LeaveRequest[]>([]);
  
  // Context Modal State
  selectedRequest = signal<LeaveRequest | null>(null);
  employeeBalances = signal<LeaveBalance[]>([]);
  employeePastLeaves = signal<LeaveRequest[]>([]);
  isApprovalModalOpen = signal(false);

  ngOnInit() {
    this.loadAllRequests();
  }

  loadAllRequests() {
    this.isLoading.set(true);
    // Assumes an endpoint exists to fetch all company leave requests
    this.leaveService.getAllLeaveRequests(this.authState.employeeProfileId()!).subscribe({
      next: (data) => {
        const all = data || [];
        // Split into pending and resolved
        this.pendingRequests.set(all.filter(req => req.status === 'PENDING'));
        this.requestHistory.set(all.filter(req => req.status !== 'PENDING'));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Opens the dialog and fetches the exact context needed to make a decision
  openApprovalDialog(request: LeaveRequest) {
    this.selectedRequest.set(request);
    this.isApprovalModalOpen.set(true);
    
    const empId = request.employeeProfileId;
    const currentYear = new Date().getFullYear();

    // Fetch this specific employee's balances
    this.leaveService.getEmployeeBalances(empId, currentYear).subscribe(bals => {
      this.employeeBalances.set(bals || []);
    });

    // Fetch this specific employee's past leaves (filter out the current pending one)
    this.leaveService.getEmployeeLeaveRequests(empId).subscribe(past => {
      const history = (past || []).filter(p => p.id !== request.id);
      this.employeePastLeaves.set(history);
    });
  }

  updateStatus(status: 'APPROVED' | 'REJECTED') {
    const req = this.selectedRequest();
    if (!req || !req.id) return;

    this.isActionLoading.set(true);
    const managerId = this.authState.employeeProfileId()!; 

    this.leaveService.updateLeaveStatus(req.id, status, managerId).subscribe({
      next: () => {
        this.isApprovalModalOpen.set(false);
        this.isActionLoading.set(false);
        this.loadAllRequests(); // Refresh the queues
      },
      error: () => {
        alert(`Failed to mark request as ${status}.`);
        this.isActionLoading.set(false);
      }
    });
  }

  // --- UI Helpers ---
  getStatusClass(status?: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'WITHDRAWN': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getInitials(name?: string) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}