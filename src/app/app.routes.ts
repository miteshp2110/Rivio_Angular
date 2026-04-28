import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Public Route
  {
    path: 'login',
    loadComponent: () => import('./features/auth-users/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  
  // Protected Routes (Wrapped in the Main Layout with Sidebar/Navbar)
  {
    path: '',
    loadComponent: () => import('./core/layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'company',
        loadComponent: () => import('./features/company/company-structure/company-structure').then(m => m.CompanyStructureComponent)
      },
      // --- NEW: Dedicated Self-Service Branch ---
      {
        path: 'self-service',
        children: [
          {
            path: 'attendance',
            loadComponent: () => import('./features/self-service/my-attendance/my-attendance.component').then(m => m.MyAttendanceComponent)
          },
          {
            path: 'leaves',
            loadComponent: () => import('./features/self-service/employee-leaves/employee-leaves.component').then(m => m.EmployeeLeavesComponent)
          },
          {
            path: 'payslips', // <-- NEW
            loadComponent: () => import('./features/self-service/employee-payslips/employee-payslips.component').then(m => m.EmployeePayslipsComponent)
          },
          { path: 'profile', loadComponent: () => import('./features/self-service/my-profile/my-profile.component').then(m => m.MyProfileComponent) }
          // You can add 'attendance' and 'payslips' here later
        ]
      },
      {
        path: 'employees',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/employees/employee-directory/employee-directory').then(m => m.EmployeeDirectoryComponent)
          },
          {
            path: ':id', 
            loadComponent: () => import('./features/employees/employee-profile/employee-profile').then(m => m.EmployeeProfileComponent)
          }
        ]
      },
      {
        path: 'leave', // Admin Leave Approvals
        loadComponent: () => import('./features/leave/leave-dashboard/leave-dashboard.component').then(m => m.LeaveDashboard)
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
      },
      {
        path: 'ats',
        loadComponent: () => import('./features/recruitment/recruitment-dashboard/recruitment-dashboard.component').then(m => m.RecruitmentDashboardComponent)
      },
      {
        path: 'payroll',
        loadComponent: () => import('./features/payroll/payroll-dashboard/payroll-dashboard').then(m => m.PayrollDashboardComponent)
      }
    ]
  },
  
  // Fallback route
  { path: '**', redirectTo: 'dashboard' }
];