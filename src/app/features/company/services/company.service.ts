import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';

export interface Department { 
  id: number; 
  name: string; 
  managerEmail: string | null;
  managerUserId: number | null;
}

export interface Designation { 
  id: number; 
  title: string; 
  departmentId: number; 
  departmentName: string;
}

export interface Location { 
  id: number; 
  name: string; 
  currencyCode?: string; // New field
  timezone?: string;     // New field
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private api = inject(BaseApiService);

  // --- Departments ---
  getDepartments(): Observable<Department[]> {
    return this.api.get<Department[]>('/departments');
  }
  createDepartment(payload: Partial<Department>): Observable<Department> {
    return this.api.post<Department>('/departments', payload);
  }
  updateDepartment(id: number, payload: Partial<Department>): Observable<Department> {
    return this.api.put<Department>(`/departments/${id}`, payload);
  }
  deleteDepartment(id: number): Observable<void> {
    return this.api.delete<void>(`/departments/${id}`);
  }

  // --- Designations ---
  getDesignations(): Observable<Designation[]> {
    return this.api.get<Designation[]>('/designations');
  }
  createDesignation(payload: Partial<Designation>): Observable<Designation> {
    return this.api.post<Designation>('/designations', payload);
  }
  updateDesignation(id: number, payload: Partial<Designation>): Observable<Designation> {
    return this.api.put<Designation>(`/designations/${id}`, payload);
  }
  deleteDesignation(id: number): Observable<void> {
    return this.api.delete<void>(`/designations/${id}`);
  }

  // --- Locations ---
  getLocations(): Observable<Location[]> {
    return this.api.get<Location[]>('/locations');
  }
  createLocation(payload: Partial<Location>): Observable<Location> {
    return this.api.post<Location>('/locations', payload);
  }
  updateLocation(id: number, payload: Partial<Location>): Observable<Location> {
    return this.api.put<Location>(`/locations/${id}`, payload);
  }
  deleteLocation(id: number): Observable<void> {
    return this.api.delete<void>(`/locations/${id}`);
  }
}