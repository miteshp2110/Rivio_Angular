import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

// Constants for clean code
const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  HR: 'Hr',
  PAYROLL: 'Payroll Manager',
  MANAGER: 'Manager'
};

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth-users/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Safe default for everyone
      { path: '', redirectTo: 'self-service/profile', pathMatch: 'full' }, 
      
      // --- UNIVERSAL SELF-SERVICE ROUTES ---
      {
        path: 'self-service',
        children: [
          { path: 'profile', loadComponent: () => import('./features/self-service/my-profile/my-profile.component').then(m => m.MyProfileComponent) },
          { path: 'attendance', loadComponent: () => import('./features/self-service/my-attendance/my-attendance.component').then(m => m.MyAttendanceComponent) },
          { path: 'leaves', loadComponent: () => import('./features/self-service/employee-leaves/employee-leaves.component').then(m => m.EmployeeLeavesComponent) },
          { path: 'payslips', loadComponent: () => import('./features/self-service/employee-payslips/employee-payslips.component').then(m => m.EmployeePayslipsComponent) }
        ]
      },

      // --- SECURED ADMIN & MANAGER ROUTES ---
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR] }
      },
      {
        path: 'employees',
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.PAYROLL, ROLES.MANAGER] },
        children: [
          { path: '', loadComponent: () => import('./features/employees/employee-directory/employee-directory').then(m => m.EmployeeDirectoryComponent) },
          { path: ':id', loadComponent: () => import('./features/employees/employee-profile/employee-profile').then(m => m.EmployeeProfileComponent) }
        ]
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/attendance-dashboard/attendance-dashboard.component').then(m => m.AttendanceDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.PAYROLL, ROLES.MANAGER] }
      },
      {
        path: 'leave',
        loadComponent: () => import('./features/leave/leave-dashboard/leave-dashboard.component').then(m => m.LeaveDashboard),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER] }
      },
      {
        path: 'payroll',
        loadComponent: () => import('./features/payroll/payroll-dashboard/payroll-dashboard').then(m => m.PayrollDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.PAYROLL] }
      },
      {
        path: 'ats',
        loadComponent: () => import('./features/recruitment/recruitment-dashboard/recruitment-dashboard.component').then(m => m.RecruitmentDashboardComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR] }
      },
      {
        path: 'company',
        loadComponent: () => import('./features/company/company-structure/company-structure').then(m => m.CompanyStructureComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN] } // Only Super Admin manages company structure
      },
      {
        path: 'ask-rivi',
        loadComponent: () => import('./features/ai-assistant/ask-rivi/ask-rivi.component').then(m => m.AskRiviComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.PAYROLL, ROLES.MANAGER] }
      },
    ]
  },
  
  // Fallback route
  { path: '**', redirectTo: 'self-service/profile' }
];