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

  // Chart Configurations (Premium Color Palette)
  deptChartData = computed(() => {
    const data = this.summary()?.departmentDistribution || [];
    return {
      labels: data.map(d => d.departmentName),
      datasets: [{
        data: data.map(d => d.employeeCount),
        backgroundColor: [
          '#0f172a', // Slate 900
          '#f59e0b', // Amber 500
          '#334155', // Slate 700
          '#94a3b8', // Slate 400
          '#d97706'  // Amber 600
        ],
        hoverBackgroundColor: [
          '#1e293b', // Slate 800
          '#fbbf24', // Amber 400
          '#475569', // Slate 600
          '#cbd5e1', // Slate 300
          '#f59e0b'  // Amber 500
        ],
        borderWidth: 0 // Removes white borders for a cleaner, modern look
      }]
    };
  });

  attendanceChartData = computed(() => {
    const data = this.summary()?.attendanceTrend || [];
    return {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Attendance Rate (%)',
        data: data.map(d => d.presentRate),
        fill: true,
        borderColor: '#f59e0b', // Amber 500 line
        pointBackgroundColor: '#0f172a', // Slate 900 points
        pointBorderColor: '#ffffff',
        tension: 0.4, // Creates the smooth curve
        backgroundColor: 'rgba(245, 158, 11, 0.1)' // Very subtle amber fill underneath
      }]
    };
  });

  // Reusable Chart Options
  chartOptions = {
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: { usePointStyle: true, color: '#334155' } // Slate 700 text
      } 
    },
    responsive: true,
    maintainAspectRatio: false
  };

  lineChartOptions = {
    plugins: { 
      legend: { display: false } 
    },
    scales: { 
      y: { 
        min: 0, 
        max: 100, 
        ticks: { 
          callback: (val: number) => val + '%',
          color: '#64748b' // Slate 500
        },
        grid: { color: '#f1f5f9' } // Slate 100
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#64748b' } // Slate 500
      }
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