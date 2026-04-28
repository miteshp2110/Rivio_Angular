import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutState } from '../../state/layout.state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  host: {
    class: 'h-full block flex-shrink-0 z-50' 
  }
})
export class SidebarComponent {
  layoutState = inject(LayoutState);

  // Signal to control the Self-Service accordion
  isSelfServiceOpen = signal(false);

  navItems = [
    { label: 'Dashboard', icon: 'pi-home', route: '/dashboard' },
    { label: 'Employees', icon: 'pi-users', route: '/employees' },
    { label: 'Attendance', icon: 'pi-calendar-clock', route: '/attendance' },
    { label: 'Leave Approvals', icon: 'pi-calendar-minus', route: '/leave' }, // Fixed to match app.routes
    { label: 'Payroll', icon: 'pi-money-bill', route: '/payroll' },
    { label: 'Recruitment', icon: 'pi-briefcase', route: '/ats' },
    { label: 'Company', icon: 'pi-building', route: '/company' }
  ];

  selfServiceItems = [
    { label: 'My Leaves', route: '/self-service/leaves' },
    { label: 'My Attendance', route: '/self-service/attendance' },
    { label: 'My Payslips', route: '/self-service/payslips' }
  ];

  toggleSelfService() {
    // Smart UX: If they click the icon while collapsed, expand the sidebar first!
    if (this.layoutState.isSidebarCollapsed()) {
      this.layoutState.toggleSidebar();
      this.isSelfServiceOpen.set(true);
    } else {
      this.isSelfServiceOpen.set(!this.isSelfServiceOpen());
    }
  }
}