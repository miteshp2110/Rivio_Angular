// import { Injectable, signal, computed } from '@angular/core';

// export interface UserState {
//   token: string | null;
//   name: string | null;
//   role: string | null;
//   userId: number | null;
//   employeeProfileId: number | null;
//   isAuthenticated: boolean;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthState {
//   private state = signal<UserState>({
//     token: localStorage.getItem('rivio_token'),
//     name: localStorage.getItem('rivio_user_name'),
//     role: localStorage.getItem('rivio_role'),
//     // Parse strings back to numbers for the IDs
//     userId: localStorage.getItem('rivio_user_id') ? Number(localStorage.getItem('rivio_user_id')) : null,
//     employeeProfileId: localStorage.getItem('rivio_emp_id') ? Number(localStorage.getItem('rivio_emp_id')) : null,
//     isAuthenticated: !!localStorage.getItem('rivio_token')
//   });

//   // Computed signals
//   readonly token = computed(() => this.state().token);
//   readonly currentUser = computed(() => this.state().name);
//   readonly employeeProfileId = computed(() => this.state().employeeProfileId);
//   readonly isAuthenticated = computed(() => this.state().isAuthenticated);

//   // Update session to accept the new payload
//   setSession(token: string, name: string, role: string, userId: number, employeeProfileId: number) {
//     localStorage.setItem('rivio_token', token);
//     localStorage.setItem('rivio_user_name', name);
//     localStorage.setItem('rivio_role', role);
//     localStorage.setItem('rivio_user_id', userId.toString());
//     localStorage.setItem('rivio_emp_id', employeeProfileId.toString());

//     this.state.set({ token, name, role, userId, employeeProfileId, isAuthenticated: true });
//   }

//   clearSession() {
//     localStorage.clear(); // Safely wipes all rivio keys
//     this.state.set({ token: null, name: null, role: null, userId: null, employeeProfileId: null, isAuthenticated: false });
//   }
// }

import { Injectable, signal, computed } from '@angular/core';

export interface UserState {
  token: string | null;
  name: string | null;
  role: string | null;
  userId: number | null;
  employeeProfileId: number | null;
  isAuthenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthState {
  private state = signal<UserState>({
    token: localStorage.getItem('rivio_token'),
    name: localStorage.getItem('rivio_user_name'),
    role: localStorage.getItem('rivio_role'),
    // Parse strings back to numbers for the IDs
    userId: localStorage.getItem('rivio_user_id') ? Number(localStorage.getItem('rivio_user_id')) : null,
    employeeProfileId: localStorage.getItem('rivio_emp_id') ? Number(localStorage.getItem('rivio_emp_id')) : null,
    isAuthenticated: !!localStorage.getItem('rivio_token')
  });

  // --- Computed signals ---
  readonly token = computed(() => this.state().token);
  readonly currentUser = computed(() => this.state().name);
  
  // ADDED THESE TWO LINES:
  readonly role = computed(() => this.state().role);
  readonly userId = computed(() => this.state().userId);
  
  readonly employeeProfileId = computed(() => this.state().employeeProfileId);
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);

  // Update session to accept the new payload
  setSession(token: string, name: string, role: string, userId: number, employeeProfileId: number) {
    localStorage.setItem('rivio_token', token);
    localStorage.setItem('rivio_user_name', name);
    localStorage.setItem('rivio_role', role);
    localStorage.setItem('rivio_user_id', userId.toString());
    localStorage.setItem('rivio_emp_id', employeeProfileId.toString());

    this.state.set({ token, name, role, userId, employeeProfileId, isAuthenticated: true });
  }

  clearSession() {
    localStorage.clear(); // Safely wipes all rivio keys
    this.state.set({ token: null, name: null, role: null, userId: null, employeeProfileId: null, isAuthenticated: false });
  }
}