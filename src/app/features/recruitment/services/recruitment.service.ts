import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from '../../../core/services/base-api.service';

export interface JobOpening {
  id: number;
  title: string;
  departmentId?: number;
  locationId?: number;
  departmentName?: string;
  locationName?: string;
  status?: string;
  applicantCount?: number;
}

// STRICT ENUM MATCHING BACKEND
export type CandidateStage = 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED';

export interface Candidate {
  id: number;
  name: string; 
  email: string;
  resumeUrl?: string;
  stage: CandidateStage; 
  jobOpeningId: number;
  jobOpeningTitle: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {
  private api = inject(BaseApiService);

  // --- Job Openings ---
  getJobOpenings(): Observable<JobOpening[]> {
    return this.api.get<JobOpening[]>('/job-openings');
  }

  createJobOpening(payload: any): Observable<JobOpening> {
    return this.api.post<JobOpening>('/job-openings', payload);
  }

  getJobOpeningById(id: number): Observable<JobOpening> {
    return this.api.get<JobOpening>(`/job-openings/${id}`);
  }

  updateJobStatus(id: number, status: string): Observable<any> {
    return this.api.patch(`/job-openings/${id}/status`, { status });
  }

  deleteJobOpening(id: number): Observable<void> {
    return this.api.delete<void>(`/job-openings/${id}`);
  }

  // --- Candidates ---
  applyForJob(jobId: number, payload: any): Observable<Candidate> {
    return this.api.post<Candidate>(`/job-openings/${jobId}/candidates`, payload);
  }

  getCandidatesForJob(jobId: number, stage?: string): Observable<Candidate[]> {
    const url = stage ? `/job-openings/${jobId}/candidates?stage=${stage}` : `/job-openings/${jobId}/candidates`;
    return this.api.get<Candidate[]>(url);
  }

  getCandidateById(id: number): Observable<Candidate> {
    return this.api.get<Candidate>(`/candidates/${id}`);
  }

  updateCandidateStage(id: number, stage: CandidateStage): Observable<any> {
    return this.api.put(`/candidates/${id}/stage`, { stage });
  }

  hireCandidate(id: number): Observable<any> {
    return this.api.post(`/candidates/${id}/hire`, {});
  }
}