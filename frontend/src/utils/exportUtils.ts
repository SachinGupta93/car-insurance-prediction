import { DamageResult } from '@/types';

/**
 * Data export utilities for generating PDF and Excel reports
 */

// Type definitions for external libraries
interface JsPDFDocument {
  text: (text: string, x: number, y: number) => void;
  setFontSize: (size: number) => void;
  setFont: (font: string, style?: string) => void;
  addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
  addPage: () => void;
  save: (filename: string) => void;
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
}

interface ExcelWorkbook {
  SheetNames: string[];
  Sheets: Record<string, any>;
}

declare global {
  interface Window {
    jsPDF: new (orientation?: string, unit?: string, format?: string) => JsPDFDocument;
    XLSX: {
      utils: {
        book_new: () => ExcelWorkbook;
        aoa_to_sheet: (data: any[][]) => any;
        json_to_sheet: (data: any[]) => any;
        book_append_sheet: (workbook: ExcelWorkbook, worksheet: any, name: string) => void;
      };
      writeFile: (workbook: ExcelWorkbook, filename: string) => void;
    };
  }
}

/**
 * Load external libraries dynamically
 */
const loadExternalLibraries = async (): Promise<{ jsPDF: any; XLSX: any }> => {
  // Load jsPDF
  if (!window.jsPDF) {
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(jsPDFScript);
    
    await new Promise((resolve, reject) => {
      jsPDFScript.onload = resolve;
      jsPDFScript.onerror = reject;
    });
  }

  // Load SheetJS (XLSX)
  if (!window.XLSX) {
    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(xlsxScript);
    
    await new Promise((resolve, reject) => {
      xlsxScript.onload = resolve;
      xlsxScript.onerror = reject;
    });
  }

  return {
    jsPDF: window.jsPDF,
    XLSX: window.XLSX
  };
};

/**
 * Export analysis results to PDF
 */
export const exportToPDF = async (
  analysisResult: DamageResult,
  imageUrl?: string,
  filename?: string
): Promise<void> => {
  try {
    const { jsPDF } = await loadExternalLibraries();
    const doc = new jsPDF() as JsPDFDocument;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Helper function to add text with wrapping
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      // Simple text wrapping
      const maxWidth = pageWidth - 2 * margin;
      const lines = text.split('\n');
      
      lines.forEach(line => {
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(line, margin, currentY);
        currentY += fontSize * 0.5;
      });
      
      currentY += 5; // Add spacing after text
    };

    // Helper function to add a section header
    const addSectionHeader = (title: string) => {
      currentY += 10;
      addText(title, 16, true);
      currentY += 5;
    };

    // Title
    addText('Vehicle Damage Analysis Report', 20, true);
    addText(`Generated: ${new Date().toLocaleString()}`, 12);
    addText(`Report ID: RPT-${Date.now()}`, 12);

    // Executive Summary
    addSectionHeader('Executive Summary');
    const vehicleInfo = (analysisResult as any).vehicleIdentification || (analysisResult as any).vehicleInformation;
    const damageAssessment = (analysisResult as any).damageAssessment;
    
    addText(`Damage Status: ${damageAssessment?.isDamaged ? 'Damaged' : 'No Damage Detected'}`);
    addText(`Overall Severity: ${damageAssessment?.overallSeverity || 'Not Specified'}`);
    addText(`Analysis Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
    addText(`Damage Type: ${analysisResult.damageType}`);
    addText(`Regions Identified: ${(analysisResult.identifiedDamageRegions || []).length}`);

    // Vehicle Information
    if (vehicleInfo) {
      addSectionHeader('Vehicle Information');
      addText(`Make: ${vehicleInfo.make || 'Unknown'}`);
      addText(`Model: ${vehicleInfo.model || 'Unknown'}`);
      addText(`Year: ${vehicleInfo.year || 'Unknown'}`);
      addText(`Trim: ${vehicleInfo.trim || 'Unknown'}`);
      if (vehicleInfo.estimatedValue) {
        addText(`Estimated Value: ₹${vehicleInfo.estimatedValue.toLocaleString()}`);
      }
    }

    // Add image if available
    if (imageUrl) {
      try {
        // Add image section
        addSectionHeader('Analyzed Image');
        currentY += 10;
        
        // Create a canvas to resize image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        
        // Resize image to fit PDF
        const maxImageWidth = pageWidth - 2 * margin;
        const maxImageHeight = 150;
        
        let imageWidth = img.width;
        let imageHeight = img.height;
        
        if (imageWidth > maxImageWidth) {
          imageHeight = (imageHeight * maxImageWidth) / imageWidth;
          imageWidth = maxImageWidth;
        }
        
        if (imageHeight > maxImageHeight) {
          imageWidth = (imageWidth * maxImageHeight) / imageHeight;
          imageHeight = maxImageHeight;
        }
        
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        ctx?.drawImage(img, 0, 0, imageWidth, imageHeight);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (currentY + imageHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        
        doc.addImage(imageData, 'JPEG', margin, currentY, imageWidth, imageHeight);
        currentY += imageHeight + 10;
      } catch (error) {
        console.warn('Could not add image to PDF:', error);
      }
    }

    // Damage Assessment
    addSectionHeader('Damage Assessment');
    if (analysisResult.description) {
      addText('Analysis Description:', 14, true);
      addText(analysisResult.description);
    }

    // Damage Regions
    if ((analysisResult.identifiedDamageRegions || []).length > 0) {
      addSectionHeader('Identified Damage Regions');
      (analysisResult.identifiedDamageRegions || []).forEach((region, index) => {
        addText(`Region ${index + 1}: ${region.partName || `Area ${index + 1}`}`, 12, true);
        addText(`  Damage Type: ${region.damageType}`);
        addText(`  Severity: ${region.severity}`);
        addText(`  Confidence: ${((region.confidence || 0) * 100).toFixed(1)}%`);
        addText(`  Damage Level: ${region.damagePercentage || 0}%`);
        if (region.estimatedCost) {
          addText(`  Estimated Cost: ₹${region.estimatedCost.toLocaleString()}`);
        }
        currentY += 5;
      });
    }

    // Cost Analysis
    const costSummary = (analysisResult as any).enhancedRepairCost || (analysisResult as any).comprehensiveCostSummary;
    if (costSummary) {
      addSectionHeader('Cost Analysis');
      addText(`Labor Costs: ₹${(costSummary.laborCost || costSummary.labor || 0).toLocaleString()}`);
      addText(`Parts Costs: ₹${(costSummary.partsCost || costSummary.parts || 0).toLocaleString()}`);
      addText(`Paint Costs: ₹${(costSummary.paintCost || costSummary.paint || 0).toLocaleString()}`);
      addText(`Other Costs: ₹${(costSummary.otherCosts || costSummary.miscellaneous || 0).toLocaleString()}`);
      
      const totalCost = (costSummary.laborCost || costSummary.labor || 0) +
                       (costSummary.partsCost || costSummary.parts || 0) +
                       (costSummary.paintCost || costSummary.paint || 0) +
                       (costSummary.otherCosts || costSummary.miscellaneous || 0);
      
      addText(`Total Estimated Cost: ₹${totalCost.toLocaleString()}`, 14, true);
    }

    // Insurance Recommendation
    const insuranceRecommendation = (analysisResult as any).insuranceRecommendation;
    if (insuranceRecommendation) {
      addSectionHeader('Insurance Recommendation');
      addText(`Status: ${insuranceRecommendation.recommendationStatus}`);
      if (insuranceRecommendation.action) {
        addText(`Action: ${insuranceRecommendation.action}`);
      }
      if (insuranceRecommendation.rationale) {
        addText(`Rationale: ${insuranceRecommendation.rationale}`);
      }
    }

    // Recommendations
    if (analysisResult.recommendations) {
      addSectionHeader('Expert Recommendations');
      analysisResult.recommendations.forEach((rec: string, index: number) => {
        addText(`${index + 1}. ${rec}`);
      });
    }

    // Save the PDF
    const pdfFilename = filename || `damage-analysis-report-${Date.now()}.pdf`;
    doc.save(pdfFilename);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

/**
 * Export analysis results to Excel
 */
export const exportToExcel = async (
  analysisResult: DamageResult,
  filename?: string
): Promise<void> => {
  try {
    const { XLSX } = await loadExternalLibraries();
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Vehicle Damage Analysis Report', ''],
      ['Generated', new Date().toLocaleString()],
      ['Report ID', `RPT-${Date.now()}`],
      ['', ''],
      ['EXECUTIVE SUMMARY', ''],
      ['Damage Type', analysisResult.damageType],
      ['Confidence Level', `${(analysisResult.confidence * 100).toFixed(1)}%`],
      ['Regions Identified', (analysisResult.identifiedDamageRegions || []).length.toString()],
    ];

    const vehicleInfo = (analysisResult as any).vehicleIdentification || (analysisResult as any).vehicleInformation;
    const damageAssessment = (analysisResult as any).damageAssessment;
    
    if (damageAssessment) {
      summaryData.push(
        ['Damage Status', damageAssessment.isDamaged ? 'Damaged' : 'No Damage'],
        ['Overall Severity', damageAssessment.overallSeverity || 'Not Specified']
      );
    }

    if (vehicleInfo) {
      summaryData.push(
        ['', ''],
        ['VEHICLE INFORMATION', ''],
        ['Make', vehicleInfo.make || 'Unknown'],
        ['Model', vehicleInfo.model || 'Unknown'],
        ['Year', vehicleInfo.year || 'Unknown'],
        ['Trim', vehicleInfo.trim || 'Unknown']
      );
      
      if (vehicleInfo.estimatedValue) {
        summaryData.push(['Estimated Value', `₹${vehicleInfo.estimatedValue.toLocaleString()}`]);
      }
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Damage Regions Sheet
    if ((analysisResult.identifiedDamageRegions || []).length > 0) {
      const regionsData = [
        ['Region', 'Part Name', 'Damage Type', 'Severity', 'Confidence (%)', 'Damage Level (%)', 'Location X', 'Location Y', 'Estimated Cost (₹)']
      ];

      (analysisResult.identifiedDamageRegions || []).forEach((region, index) => {
        regionsData.push([
          `Region ${index + 1}`,
          region.partName || `Area ${index + 1}`,
          region.damageType,
          region.severity,
          ((region.confidence || 0) * 100).toFixed(1),
          (region.damagePercentage || 0).toString(),
          region.x?.toString() || '',
          region.y?.toString() || '',
          region.estimatedCost?.toLocaleString() || ''
        ]);
      });

      const regionsSheet = XLSX.utils.aoa_to_sheet(regionsData);
      XLSX.utils.book_append_sheet(workbook, regionsSheet, 'Damage Regions');
    }

    // Cost Analysis Sheet
    const costSummary = (analysisResult as any).enhancedRepairCost || (analysisResult as any).comprehensiveCostSummary;
    if (costSummary) {
      const costData = [
        ['Cost Category', 'Amount (₹)'],
        ['Labor Costs', (costSummary.laborCost || costSummary.labor || 0).toLocaleString()],
        ['Parts Costs', (costSummary.partsCost || costSummary.parts || 0).toLocaleString()],
        ['Paint Costs', (costSummary.paintCost || costSummary.paint || 0).toLocaleString()],
        ['Other Costs', (costSummary.otherCosts || costSummary.miscellaneous || 0).toLocaleString()],
        ['', ''],
        ['Total Estimated Cost', (
          (costSummary.laborCost || costSummary.labor || 0) +
          (costSummary.partsCost || costSummary.parts || 0) +
          (costSummary.paintCost || costSummary.paint || 0) +
          (costSummary.otherCosts || costSummary.miscellaneous || 0)
        ).toLocaleString()]
      ];

      if (costSummary.regionalVariations) {
        costData.push(['', ''], ['REGIONAL VARIATIONS', '']);
        Object.entries(costSummary.regionalVariations).forEach(([region, cost]) => {
          costData.push([region, (cost as number).toLocaleString()]);
        });
      }

      const costSheet = XLSX.utils.aoa_to_sheet(costData);
      XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Analysis');
    }

    // Insurance Sheet
    const insuranceRecommendation = (analysisResult as any).insuranceRecommendation;
    if (insuranceRecommendation) {
      const insuranceData = [
        ['Insurance Recommendation', ''],
        ['Status', insuranceRecommendation.recommendationStatus],
        ['Action Required', insuranceRecommendation.action || 'No specific action'],
        ['Rationale', insuranceRecommendation.rationale || ''],
        ['', '']
      ];

      if (insuranceRecommendation.actionPlan) {
        insuranceData.push(['Action Plan', '']);
        insuranceRecommendation.actionPlan.forEach((action: string, index: number) => {
          insuranceData.push([`${index + 1}`, action]);
        });
      }

      const insuranceSheet = XLSX.utils.aoa_to_sheet(insuranceData);
      XLSX.utils.book_append_sheet(workbook, insuranceSheet, 'Insurance');
    }

    // Recommendations Sheet
    if (analysisResult.recommendations) {
      const recommendationsData = [
        ['#', 'Recommendation']
      ];

      analysisResult.recommendations.forEach((rec: string, index: number) => {
        recommendationsData.push([`${index + 1}`, rec]);
      });

      const recommendationsSheet = XLSX.utils.aoa_to_sheet(recommendationsData);
      XLSX.utils.book_append_sheet(workbook, recommendationsSheet, 'Recommendations');
    }

    // Save the Excel file
    const excelFilename = filename || `damage-analysis-report-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, excelFilename);
    
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error('Failed to generate Excel report');
  }
};

/**
 * Export raw analysis data as JSON
 */
export const exportToJSON = (
  analysisResult: DamageResult,
  filename?: string
): void => {
  try {
    const exportData = {
      reportId: `RPT-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      analysisResult,
      metadata: {
        version: '1.0',
        format: 'JSON',
        exported: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `damage-analysis-data-${Date.now()}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    throw new Error('Failed to export JSON data');
  }
};

/**
 * Print the current analysis report
 */
export const printReport = (): void => {
  window.print();
};

/**
 * Export utilities object
 */
export const exportUtils = {
  exportToPDF,
  exportToExcel,
  exportToJSON,
  printReport
};