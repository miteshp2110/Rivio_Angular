import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, AdminSummary } from '../services/dashboard.service';

// PrimeNG Imports
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule, ButtonModule, ProgressBarModule, ChartModule, TableModule],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  // State Signals
  summary = signal<AdminSummary | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  isSystemHealthy = signal(true);
  currentDate = new Date();

  // Chart Configurations (Computed based on fetched summary)
  deptChartData = computed(() => {
    const data = this.summary()?.departmentDistribution || [];
    const documentStyle = getComputedStyle(document.documentElement);
    return {
      labels: data.map(d => d.departmentName),
      datasets: [{
        data: data.map(d => d.employeeCount),
        backgroundColor: [
          documentStyle.getPropertyValue('--blue-500'),
          documentStyle.getPropertyValue('--green-500'),
          documentStyle.getPropertyValue('--yellow-500'),
          documentStyle.getPropertyValue('--cyan-500'),
          documentStyle.getPropertyValue('--pink-500')
        ],
        hoverBackgroundColor: [
          documentStyle.getPropertyValue('--blue-400'),
          documentStyle.getPropertyValue('--green-400'),
          documentStyle.getPropertyValue('--yellow-400'),
          documentStyle.getPropertyValue('--cyan-400'),
          documentStyle.getPropertyValue('--pink-400')
        ]
      }]
    };
  });

  attendanceChartData = computed(() => {
    const data = this.summary()?.attendanceTrend || [];
    const documentStyle = getComputedStyle(document.documentElement);
    return {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Attendance Rate (%)',
        data: data.map(d => d.presentRate),
        fill: true,
        borderColor: documentStyle.getPropertyValue('--blue-500'),
        tension: 0.4,
        backgroundColor: 'rgba(59, 130, 246, 0.1)' // Light blue fill
      }]
    };
  });

  // Reusable Chart Options
  chartOptions = {
    plugins: { legend: { position: 'bottom' } },
    responsive: true,
    maintainAspectRatio: false
  };

  lineChartOptions = {
    plugins: { legend: { display: false } },
    scales: { 
      y: { min: 0, max: 100, ticks: { callback: (val: number) => val + '%' } },
      x: { grid: { display: false } }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  ngOnInit() {
    this.fetchDashboardData();
    this.checkSystemHealth();
  }

  fetchDashboardData() {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.dashboardService.getAdminSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard KPIs', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  checkSystemHealth() {
    this.dashboardService.getSystemHealth().subscribe({
      next: () => this.isSystemHealthy.set(true),
      error: () => this.isSystemHealthy.set(false)
    });
  }

  refresh() {
    this.fetchDashboardData();
  }
}