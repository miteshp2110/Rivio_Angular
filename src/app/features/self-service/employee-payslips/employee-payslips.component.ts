import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { PayrollService, Payslip } from '../../payroll/services/payroll.service';
import { AuthState } from '../../../core/state/auth.state';

// PrimeNG
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

// PDF Generators
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-employee-payslips',
  standalone: true,
  imports: [CommonModule, TableModule, DialogModule],
  templateUrl: './employee-payslips.component.html'
})
export class EmployeePayslipsComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private authState = inject(AuthState);

  // Dynamically fetch the logged-in employee's profile ID
  currentEmployeeId = this.authState.employeeProfileId() || 10;
  
  // UI State Signals
  isLoading = signal(true);
  isDownloading = signal(false);
  payslips = signal<Payslip[]>([]);
  
  // Modal State Signals
  selectedPayslip = signal<Payslip | null>(null);
  isViewModalOpen = signal(false);

  ngOnInit() {
    this.loadPayslips();
  }

  loadPayslips() {
    this.isLoading.set(true);
    
    this.payrollService.getEmployeePayslipHistory(this.currentEmployeeId)
      .pipe(
        finalize(() => this.isLoading.set(false)) // Guarantees loader turns off
      )
      .subscribe({
        next: (data) => {
          // Sort newest first based on payCycleId
          const sorted = (data || []).sort((a, b) => b.payCycleId - a.payCycleId);
          this.payslips.set(sorted);
        },
        error: () => {
          // Silent catch: The table will simply show the empty state message
          this.payslips.set([]); 
        }
      });
  }

  viewPayslip(slip: Payslip) {
    this.selectedPayslip.set(slip);
    this.isViewModalOpen.set(true);
  }

  downloadPdf() {
    const slip = this.selectedPayslip();
    const element = document.getElementById('payslip-pdf-content'); 
    
    if (!element || !slip) return;

    this.isDownloading.set(true);

    // Take a high-resolution snapshot of the HTML element
    html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      
      // Initialize a standard A4 PDF (portrait, millimeters)
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Clean naming convention: Payslip_EMP-101_Jan_2026.pdf
      const cycleIdentifier = slip.cycleName ? slip.cycleName.replace(/\s+/g, '_') : slip.payCycleId;
      const filename = `Payslip_${slip.employeeCode}_${cycleIdentifier}.pdf`;
      
      pdf.save(filename);
      this.isDownloading.set(false);
    }).catch(err => {
      console.error("PDF Generation Failed:", err);
      alert("Failed to generate PDF. Please try again.");
      this.isDownloading.set(false);
    });
  }
}