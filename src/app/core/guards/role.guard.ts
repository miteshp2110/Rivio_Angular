import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../state/auth.state';

export const roleGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  
  const userRole = authState.role()!; 
  const allowedRoles = route.data?.['roles'] as string[];

  // If no specific roles are required, or the user's role is in the allowed list, grant access
  if (!allowedRoles || allowedRoles.includes(userRole)) {
    return true;
  }

  // If they fail the check, kick them back to their self-service profile
  return router.parseUrl('/self-service/profile');
};