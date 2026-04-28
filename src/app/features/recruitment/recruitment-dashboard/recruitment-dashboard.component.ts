import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { RecruitmentService, JobOpening, Candidate, CandidateStage } from '../services/recruitment.service';
import { CompanyService, Department, Location } from '../../company/services/company.service';

// PrimeNG
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';

type ActiveTab = 'JOBS' | 'PIPELINE';

@Component({
  selector: 'app-recruitment-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, DialogModule, IconFieldModule, InputIconModule, SelectModule
  ],
  templateUrl: './recruitment-dashboard.component.html'
})
export class RecruitmentDashboardComponent implements OnInit {
  @ViewChild('dt') table!: Table;

  private recruitmentService = inject(RecruitmentService);
  private companyService = inject(CompanyService);
  private fb = inject(FormBuilder);

  activeTab = signal<ActiveTab>('PIPELINE');
  isLoading = signal(true);
  isSubmitting = signal(false);
  
  jobs = signal<JobOpening[]>([]);
  candidates = signal<Candidate[]>([]);
  departments = signal<Department[]>([]);
  locations = signal<Location[]>([]);

  // Sub-views & Details
  jobSpecificCandidates = signal<Candidate[]>([]);
  selectedJobTitle = signal<string>('');
  selectedCandidate = signal<Candidate | null>(null);

  // Modal States
  isJobModalOpen = signal(false);
  isCandidateModalOpen = signal(false);
  isJobCandidatesModalOpen = signal(false);
  isCandidateDetailsModalOpen = signal(false);

  // Forms
  jobForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    departmentId: [null as number | null, Validators.required],
    locationId: [null as number | null, Validators.required]
  });

  candidateForm = this.fb.nonNullable.group({
    jobOpeningId: [null as number | null, Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    resumeUrl: ['']
  });

  // Allowed Pipeline Stages based on Backend Enum (Removed SCREENING)
  pipelineStages: CandidateStage[] = ['APPLIED', 'INTERVIEWING', 'OFFERED'];
  
  // Options for dropdowns in specific views
  stageOptions = [
    { label: 'Applied', value: 'APPLIED' },
    { label: 'Interviewing', value: 'INTERVIEWING' },
    { label: 'Offered', value: 'OFFERED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  kanbanBoard = computed(() => {
    const allCands = this.candidates();
    const board: Record<string, Candidate[]> = { 'APPLIED': [], 'INTERVIEWING': [], 'OFFERED': [] };
    allCands.forEach(c => { if (board[c.stage]) board[c.stage].push(c); });
    return board;
  });

  ngOnInit() {
    this.loadData();
    this.loadCompanyStructure();
  }

  loadCompanyStructure() {
    this.companyService.getDepartments().subscribe(res => this.departments.set(res));
    this.companyService.getLocations().subscribe(res => this.locations.set(res));
  }

  loadData() {
    this.isLoading.set(true);
    this.recruitmentService.getJobOpenings().pipe(
      switchMap(jobs => {
        this.jobs.set(jobs || []);
        if (!jobs || jobs.length === 0) return of([]); 
        const candidateRequests = jobs.map(job => this.recruitmentService.getCandidatesForJob(job.id));
        return forkJoin(candidateRequests);
      })
    ).subscribe({
      next: (candidatesMatrix) => {
        this.candidates.set(candidatesMatrix.flat());
        this.isLoading.set(false);
      },
      error: () => {
        this.jobs.set([]); this.candidates.set([]); this.isLoading.set(false);
      }
    });
  }

  // --- JOB ACTIONS ---
  openNewJobModal() { this.jobForm.reset(); this.isJobModalOpen.set(true); }

  submitNewJob() {
    if (this.jobForm.invalid) return;
    this.isSubmitting.set(true);
    this.recruitmentService.createJobOpening(this.jobForm.getRawValue()).subscribe({
      next: () => { this.isJobModalOpen.set(false); this.isSubmitting.set(false); this.loadData(); },
      error: () => this.isSubmitting.set(false)
    });
  }

  toggleJobStatus(job: JobOpening) {
    const newStatus = job.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
    this.recruitmentService.updateJobStatus(job.id, newStatus).subscribe(() => this.loadData());
  }

  deleteJob(id: number) {
    if (confirm('Delete this job opening? This cannot be undone.')) {
      this.recruitmentService.deleteJobOpening(id).subscribe(() => this.loadData());
    }
  }

  // Uses GET /job-openings/{id} and GET /job-openings/{id}/candidates
  viewJobSpecificCandidates(jobId: number, jobTitle: string) {
    this.selectedJobTitle.set(jobTitle);
    this.recruitmentService.getCandidatesForJob(jobId).subscribe(cands => {
      this.jobSpecificCandidates.set(cands);
      this.isJobCandidatesModalOpen.set(true);
    });
  }

  // --- CANDIDATE ACTIONS ---
  openAddCandidateModal() { this.candidateForm.reset(); this.isCandidateModalOpen.set(true); }

  submitNewCandidate() {
    if (this.candidateForm.invalid) return;
    this.isSubmitting.set(true);
    const payload = this.candidateForm.getRawValue();
    const jobId = payload.jobOpeningId!;
    const { jobOpeningId, ...candidateData } = payload;

    this.recruitmentService.applyForJob(jobId, candidateData).subscribe({
      next: () => { this.isCandidateModalOpen.set(false); this.isSubmitting.set(false); this.loadData(); },
      error: () => this.isSubmitting.set(false)
    });
  }

  // Uses GET /candidates/{id}
  viewCandidateDetails(id: number) {
    this.recruitmentService.getCandidateById(id).subscribe(candidate => {
      this.selectedCandidate.set(candidate);
      this.isCandidateDetailsModalOpen.set(true);
    });
  }

  moveCandidate(candidate: Candidate, newStage: CandidateStage) {
    const previousStage = candidate.stage;
    // Optimistic UI Update
    this.candidates.update(cands => cands.map(c => c.id === candidate.id ? { ...c, stage: newStage } : c));
    this.jobSpecificCandidates.update(cands => cands.map(c => c.id === candidate.id ? { ...c, stage: newStage } : c));

    this.recruitmentService.updateCandidateStage(candidate.id, newStage).subscribe({
      error: () => {
        this.candidates.update(cands => cands.map(c => c.id === candidate.id ? { ...c, stage: previousStage } : c));
        alert('Failed to update candidate stage.');
      }
    });
  }

  dropdownStageChange(candidate: Candidate, event: any) {
    this.moveCandidate(candidate, event.value);
  }

  hireCandidate(candidate: Candidate) {
    if (confirm(`Officially hire ${candidate.name}?`)) {
      this.recruitmentService.hireCandidate(candidate.id).subscribe(() => {
        alert(`${candidate.name} has been hired!`);
        this.isJobCandidatesModalOpen.set(false);
        this.loadData();
      });
    }
  }

  // --- UI HELPERS ---
  getApplicantCount(jobId: number): number {
    // Filters the global candidate list to find exactly how many applied to this specific job
    return this.candidates().filter(c => c.jobOpeningId === jobId).length;
  }
  getJobStatusClass(status?: string) { return status === 'CLOSED' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'; }
  getInitials(name: string) { return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'; }
}