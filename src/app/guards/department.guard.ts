import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../services/tenant.service';

export const departmentGuard: CanActivateFn = () => {
  const tenantService = inject(TenantService);
  const router = inject(Router);

  if (tenantService.getActiveDepartment()) {
    return true;
  }

  // No department selected → redirect to department selector
  return router.createUrlTree(['/departments']);
};
