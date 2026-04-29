import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutState } from '../../state/layout.state';
import { AuthState } from '../../state/auth.state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  host: { class: 'h-full block flex-shrink-0 z-50' }
})
export class SidebarComponent {
  layoutState = inject(LayoutState);
  authState = inject(AuthState);

  isSelfServiceOpen = signal(false);

  // Define the master list of all possible admin routes and who can see them
  private masterNavItems = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard', roles: ['Super Admin', 'Hr'] },
    { label: 'Employees', icon: 'pi-users', route: '/employees', roles: ['Super Admin', 'Hr', 'Payroll Manager', 'Manager'] },
    { label: 'Attendance', icon: 'pi-calendar-clock', route: '/attendance', roles: ['Super Admin', 'Hr', 'Payroll Manager', 'Manager'] },
    { label: 'Leave Approvals', icon: 'pi-calendar-minus', route: '/leave', roles: ['Super Admin', 'Hr', 'Manager'] },
    { label: 'Payroll', icon: 'pi-money-bill', route: '/payroll', roles: ['Super Admin', 'Payroll Manager'] },
    { label: 'Recruitment', icon: 'pi-briefcase', route: '/ats', roles: ['Super Admin', 'Hr'] },
    { label: 'Company Config', icon: 'pi-building', route: '/company', roles: ['Super Admin'] }
  ];

  // MAGIC FILTER: Dynamically generates the UI based on the user's role
  filteredNavItems = computed(() => {
    const userRole = this.authState.role()!;
    return this.masterNavItems.filter(item => item.roles.includes(userRole));
  });

  // Self Service is universal; no roles required here
  selfServiceItems = [
    { label: 'My Profile', route: '/self-service/profile' },
    { label: 'My Attendance', route: '/self-service/attendance' },
    { label: 'My Leaves', route: '/self-service/leaves' },
    { label: 'My Payslips', route: '/self-service/payslips' }
  ];

  toggleSelfService() {
    if (this.layoutState.isSidebarCollapsed()) {
      this.layoutState.toggleSidebar();
      this.isSelfServiceOpen.set(true);
    } else {
      this.isSelfServiceOpen.set(!this.isSelfServiceOpen());
    }
  }
}