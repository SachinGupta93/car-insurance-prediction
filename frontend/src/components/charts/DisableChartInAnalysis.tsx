/**
 * This component replaces the AnalysisChart component in analysis views
 * to prevent unwanted chart rendering in the damage analysis view
 */
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Define the same props as the original AnalysisChart to maintain compatibility
interface ChartProps {
  data?: { [key: string]: number } | Array<{ date: string; count: number }> | any[];
  type?: 'damage-analysis' | 'cost-estimate' | 'insurance-trends' | 'severity-breakdown' | 'time-series' | 'coverage-breakdown' | 'claim-status'; 
  title?: string;
  className?: string;
  insuranceData?: any[];
  damageData?: any[];
  onDataRefresh?: () => Promise<void>;
}

const DisableChartInAnalysis: React.FC<ChartProps> = (props) => {
  const location = useLocation();
  
  // Determine page type based on URL path
  const isDashboardPage = location.pathname.includes('dashboard') || location.pathname.includes('/admin');
  const isInsurancePage = location.pathname.includes('insurance');
  const isHistoryPage = location.pathname.includes('history');
  const isAnalysisPage = location.pathname.includes('analysis') || 
                        location.pathname.includes('upload') || 
                        location.pathname === '/' ||
                        (!isDashboardPage && !isInsurancePage && !isHistoryPage);
  
  // Enable certain chart types only on specific pages
  const shouldEnableChart = () => {
    // Insurance charts only on insurance pages
    if (props.type === 'insurance-trends' && !isInsurancePage && !isDashboardPage) {
      return false;
    }
    
    // Insurance-specific charts only on insurance pages
    if ((props.type === 'coverage-breakdown' || props.type === 'claim-status') && !isInsurancePage) {
      return false;
    }
    
    // Damage analysis charts only on dashboard or history pages
    if (props.type === 'damage-analysis' && isAnalysisPage) {
      return false;
    }
    
    // Severity breakdown charts only on dashboard or history pages
    if (props.type === 'severity-breakdown' && isAnalysisPage) {
      return false;
    }
    
    // Cost charts only on dashboard or history pages
    if (props.type === 'cost-estimate' && isAnalysisPage) {
      return false;
    }
    
    return !isAnalysisPage || isDashboardPage;
  };
  
  // Log that we're preventing chart rendering
  useEffect(() => {
    if (!shouldEnableChart() && props.type) {
      console.log(`🛑 Chart rendering disabled: ${props.type} on page: ${location.pathname}`);
    }
  }, [location.pathname, props.type]);
  
  // For analysis pages, return nothing (prevents chart rendering)
  if (!shouldEnableChart()) {
    return null;
  }
  
  // For dashboard/insurance pages, render the placeholder
  return (
    <div className="bg-gray-100 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-600">
        {isDashboardPage ? "Dashboard Charts Enabled" : 
         isInsurancePage ? "Insurance Charts Enabled" :
         "Charts are available in Dashboard view"}
      </p>
    </div>
  );
};

export default DisableChartInAnalysis;
