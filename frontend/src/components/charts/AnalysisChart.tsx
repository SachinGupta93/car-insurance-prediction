import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { networkManager } from '@/utils/networkManager';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';

interface DamageData {
  type: string;
  severity?: number; 
  cost?: number;     
  confidence?: number; 
  area?: string;     
  date?: string;     // Added for time-series
  count?: number;    // Added for time-series aggregation
}

interface CostData { // Interface for the new cost trend chart
  date: string;
  cost: number;
  type: string; // e.g., 'Repair Cost'
}

interface InsuranceData {
  month: string;
  claims: number;
  averageCost: number;
  settlements: number;
}

interface ChartProps {
  data?: { [key: string]: number } | Array<{ date: string; count: number }> | CostData[]; // Updated to include CostData[]
  type?: 'damage-analysis' | 'cost-estimate' | 'insurance-trends' | 'severity-breakdown' | 'time-series' | 'coverage-breakdown' | 'claim-status'; 
  title?: string;
  className?: string;
  insuranceData?: InsuranceData[]; // Added for insurance trends
  damageData?: DamageData[]; // Added for damage data
  onDataRefresh?: () => Promise<void>;
}

const COLORS = {
  minor: '#4ade80', // Tailwind green-400 (brighter)
  moderate: '#facc15', // Tailwind yellow-400 (brighter)
  severe: '#f87171', // Tailwind red-400 (brighter)
  critical: '#ef4444', // Tailwind red-500 (standard)
  primary: '#3b82f6', // Tailwind blue-500 (standard)
  secondary: '#6366f1', // Tailwind indigo-500 (standard)
  insurance: '#06b6d4', // Tailwind cyan-500 (standard)
  
  // Professional background and text for better readability
  background: '#ffffff', // white
  text: '#1e293b', // slate-800 (dark text for contrast)
  grid: '#e2e8f0', // slate-200 (light grid lines)
  tooltipBorder: '#cbd5e1', // slate-300 (light border)
  
  // Chart colors (professional palette)
  chart1: '#2563eb', // blue-600 (slightly darker for better contrast)
  chart2: '#059669', // emerald-600
  chart3: '#d97706', // amber-600
  chart4: '#4f46e5', // indigo-600
  chart5: '#7c3aed', // violet-600
};

const DAMAGE_COLORS = [COLORS.chart1, COLORS.chart2, COLORS.chart3, COLORS.chart4, COLORS.chart5]; // Professional chart colors

export default function AnalysisChart({ 
  data,
  type, 
  title,
  className = '',
  insuranceData,
  damageData
}: ChartProps) {
  
  const sampleInsuranceData: InsuranceData[] = [
    { month: 'Jan', claims: 345, averageCost: 22400, settlements: 320 },
    { month: 'Feb', claims: 298, averageCost: 26800, settlements: 275 },
    { month: 'Mar', claims: 367, averageCost: 21200, settlements: 345 },
    { month: 'Apr', claims: 323, averageCost: 28900, settlements: 301 },
    { month: 'May', claims: 289, averageCost: 31500, settlements: 265 },
    { month: 'Jun', claims: 401, averageCost: 27500, settlements: 378 },
    { month: 'Jul', claims: 378, averageCost: 29800, settlements: 352 },
    { month: 'Aug', claims: 412, averageCost: 32400, settlements: 385 },
  ];

  // Add logging to debug data flow
  console.log('📊 AnalysisChart: Rendering chart with props:', {
    type,
    title,
    hasData: !!data,
    dataType: typeof data,
    dataLength: Array.isArray(data) ? data.length : 'not array',
    hasInsuranceData: !!insuranceData,
    insuranceDataLength: Array.isArray(insuranceData) ? insuranceData.length : 'not array',
    hasDamageData: !!damageData,
    damageDataLength: Array.isArray(damageData) ? damageData.length : 'not array'
  });

  // chartData will hold the processed data for rendering
  let chartData: any;

  // Use damageData if provided for damage-analysis charts
  if (type === 'damage-analysis' && damageData && Array.isArray(damageData)) {
    console.log('📊 AnalysisChart: Using damageData for damage-analysis chart:', damageData);
    chartData = damageData.map(item => ({
      type: item.type,
      value: item.cost || item.severity || 1,
      confidence: item.confidence || 0.8
    }));
  } else if (type === 'insurance-trends' && insuranceData && Array.isArray(insuranceData)) {
    console.log('📊 AnalysisChart: Using insuranceData for insurance-trends chart:', insuranceData);
    chartData = insuranceData;
  } else if (type === 'cost-estimate') {
    // Expect data to be CostData[] for cost-estimate charts
    chartData = data as CostData[];
  } else if (type === 'time-series' && Array.isArray(data) && data.length > 0 && 'count' in data[0]) {
    // Expect data to be Array<{ date: string; count: number }> for time-series damage trends
    chartData = data as Array<{ date: string; count: number }>;
  } else if (type === 'time-series' && Array.isArray(data) && data.length > 0 && 'cost' in data[0]) {
    // Also handle time-series for cost trends if data has 'cost' key
    chartData = data as CostData[];
  } else if (type === 'damage-analysis' && data && !Array.isArray(data)) { // Added null/undefined check for data
    // Expect data to be { [key: string]: number } for damage analysis bar chart
    chartData = Object.entries(data).map(([key, value]) => ({ type: key, value }));
  } else {
    // Fallback: if data is an array, use it directly; if it's an object, transform it.
    // This handles cases where 'type' might not be specific enough or is omitted.
    if (Array.isArray(data)) {
      chartData = data;
    } else {
      // Provide a default empty object if data is null/undefined to prevent Object.entries error
      chartData = Object.entries(data || {}).map(([key, value]) => ({ type: key, value }));
    }
  }

  console.log('📊 AnalysisChart: Final chartData processed:', {
    type,
    chartDataType: typeof chartData,
    chartDataLength: Array.isArray(chartData) ? chartData.length : 'not array',
    sampleData: Array.isArray(chartData) ? chartData.slice(0, 2) : chartData
  });

  // Check if we have any data to display
  const hasValidData = chartData && (
    (Array.isArray(chartData) && chartData.length > 0) ||
    (typeof chartData === 'object' && Object.keys(chartData).length > 0)
  );

  console.log('📊 AnalysisChart: Data validation:', {
    hasValidData,
    chartDataExists: !!chartData,
    isArray: Array.isArray(chartData),
    arrayLength: Array.isArray(chartData) ? chartData.length : 'N/A',
    objectKeys: typeof chartData === 'object' ? Object.keys(chartData || {}).length : 'N/A'
  });

  if (!hasValidData) {
    console.log('📊 AnalysisChart: No valid data available for chart type:', type);
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-sm">No data available for this chart</p>
        </div>
      </div>
    );
  }

  const insData = sampleInsuranceData; // For insurance trends, still using sample data

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return COLORS.minor;
    if (severity <= 3) return COLORS.moderate;
    if (severity <= 4) return COLORS.severe;
    return COLORS.critical;
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 2) return 'Minor';
    if (severity <= 3) return 'Moderate';
    if (severity <= 4) return 'Severe';
    return 'Critical';
  };
  const renderTimeSeriesDamageTrend = () => (
    <ResponsiveContainer width="100%" height={300}>
      {/* Ensure chartData for this chart is Array<{ date: string; count: number }> */}
      <LineChart data={chartData as Array<{ date: string; count: number }>} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="colorDamage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.chart1} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.chart1} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: COLORS.text }} 
          angle={-30} // Angle labels to prevent overlap
          textAnchor="end" // Adjust anchor for angled labels
          dy={10} // Nudge labels down
        />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} />
        <Tooltip 
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.text,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke={COLORS.chart1} 
          strokeWidth={2}
          name="Damage Occurrences" 
          dot={{ r: 4, strokeWidth: 2, fill: COLORS.background }}
          activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.chart1 }}
          fillOpacity={1} 
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTimeSeriesCostTrend = () => (
    <ResponsiveContainer width="100%" height={300}>
      {/* Ensure chartData for this chart is CostData[] */}
      <AreaChart data={chartData as CostData[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: COLORS.text }}
          angle={-30} 
          textAnchor="end"
          dy={10}
        />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} unit="₹" />
        <Tooltip 
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.text,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          }}          formatter={(value: unknown) => {
            const costDisplay = typeof value === 'number' ? `₹${value.toLocaleString()}` : 'N/A';
            return [costDisplay, 'Cost'];
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Area type="monotone" dataKey="cost" stroke={COLORS.secondary} fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} name="Repair Cost" unit="₹" activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderInsuranceTrends = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.chart1} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.chart1} stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.chart2} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.chart2} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.text }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: COLORS.text }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: COLORS.text }} tickFormatter={formatCurrency} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: COLORS.background, 
            borderColor: COLORS.tooltipBorder, 
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' // shadow-lg
          }}
          labelStyle={{ fontWeight: 'bold', color: COLORS.text }}
          formatter={(value: number, name: string) => {
            if (name === 'Average Cost') {
              return formatCurrency(value);
            }
            return value;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 14, paddingTop: 20 }} />
        <Area yAxisId="left" type="monotone" dataKey="claims" name="Analyses" stroke={COLORS.chart1} fillOpacity={1} fill="url(#colorClaims)" />
        <Area yAxisId="right" type="monotone" dataKey="averageCost" name="Average Cost" stroke={COLORS.chart2} fillOpacity={1} fill="url(#colorCost)" />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderDamageAnalysis = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart 
        data={chartData as Array<{ type: string; value: number }>}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        barSize={45} // Slightly wider bars for better visibility
      >
        <defs>
          {DAMAGE_COLORS.map((color, index) => (
            <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis 
          dataKey="type" 
          tick={{ fontSize: 12, fill: COLORS.text }} // UPDATED: fill color for dark theme
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
          angle={-30} // Angle labels to prevent overlap
          textAnchor="end" // Adjust anchor for angled labels
          height={60} // Increase height for angled labels
        />
        <YAxis 
          tick={{ fontSize: 12, fill: COLORS.text }} // UPDATED: fill color for dark theme
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
          label={{ value: 'Count / Value', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: COLORS.text, fontSize: 14 } }} // UPDATED: Label and fill
        />
        <Bar dataKey="value" fill={COLORS.primary}>
          {/* {(chartData as Array<{ type: string; value: number }>).map((entry, index) => (
            <Cell key={`cell-${index}`} fill={DAMAGE_COLORS[index % DAMAGE_COLORS.length]} />
          ))} */}
        </Bar>
        <Tooltip 
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.text,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          }}
          formatter={(value: number, name: string, props: any) => {
            // props.payload contains the data item e.g. { type: "Scratches", value: 5 }
            return [`${props.payload.type}: ${value}`, null]; 
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderSeverityBreakdownPieChart = () => {
    // Process the data to get severity breakdown
    let severityData: Array<{ name: string; value: number; fill: string }> = [];
    
    if (Array.isArray(chartData) && chartData.length > 0) {
      // If we have damage data, process it
      const severityCount = chartData.reduce((acc: any, item: any) => {
        const severity = item.severity || 'moderate';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});
      
      severityData = Object.entries(severityCount).map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count as number,
        fill: severity === 'critical' ? '#ef4444' : 
              severity === 'severe' ? '#f97316' : 
              severity === 'moderate' ? '#eab308' : '#22c55e'
      }));
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      // If we have severity breakdown object directly
      severityData = Object.entries(data).map(([severity, count]) => ({
        name: severity.charAt(0).toUpperCase() + severity.slice(1),
        value: count as number,
        fill: severity === 'critical' ? '#ef4444' : 
              severity === 'severe' ? '#f97316' : 
              severity === 'moderate' ? '#eab308' : '#22c55e'
      }));
    }
    
    if (severityData.length === 0) {
      return <div className="text-center p-4 text-gray-600">No severity data available.</div>;
    }
    
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={severityData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {severityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render the coverage breakdown pie chart
  const renderCoverageBreakdownPieChart = () => {
    // Prepare the data for visualization if it's an object
    const coverageData: Array<{name: string; value: number; fill: string}> = [];
    
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const coverageColors = {
        comprehensive: '#4361ee',
        collision: '#3a0ca3',
        liability: '#7209b7',
        thirdParty: '#f72585',
        personalAccident: '#4cc9f0',
        default: '#4895ef'
      };
      
      Object.entries(data).forEach(([key, value]) => {
        coverageData.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: typeof value === 'number' ? value : 0,
          fill: (coverageColors as any)[key] || coverageColors.default
        });
      });
    }
    
    if (coverageData.length === 0) {
      return <div className="text-center p-4 text-gray-600">No coverage data available.</div>;
    }
    
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={coverageData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {coverageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} policies`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render the claim status pie chart
  const renderClaimStatusPieChart = () => {
    // Prepare the data for visualization if it's an object
    const statusData: Array<{name: string; value: number; fill: string}> = [];
    
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const statusColors = {
        approved: '#10b981',
        pending: '#f59e0b',
        rejected: '#ef4444',
        processing: '#6366f1',
        default: '#8b5cf6'
      };
      
      Object.entries(data).forEach(([key, value]) => {
        statusData.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          value: typeof value === 'number' ? value : 0,
          fill: (statusColors as any)[key] || statusColors.default
        });
      });
    }
    
    if (statusData.length === 0) {
      return <div className="text-center p-4 text-gray-600">No claim status data available.</div>;
    }
    
    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} claims`, 'Count']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '$0';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Add detailed logging before return
  console.log('📊 AnalysisChart: About to render chart type:', type);
  console.log('📊 AnalysisChart: chartData structure:', {
    isArray: Array.isArray(chartData),
    length: Array.isArray(chartData) ? chartData.length : 'N/A',
    firstItem: Array.isArray(chartData) && chartData.length > 0 ? chartData[0] : 'N/A',
    sampleKeys: Array.isArray(chartData) && chartData.length > 0 && typeof chartData[0] === 'object' ? Object.keys(chartData[0]) : 'N/A'
  });

  // This switch statement or similar logic determines which chart to render.
  // It should be present in the actual file. The following is an example.
  // Ensure all render functions called here use the corrected data sources (chartData, insData).
  switch (type) {
    case 'damage-analysis':
      // More flexible validation for damage analysis
      if (Array.isArray(chartData) && chartData.length > 0) {
        console.log('📊 AnalysisChart: Rendering damage-analysis chart');
        return renderDamageAnalysis();
      } else {
        console.log('📊 AnalysisChart: No valid damage-analysis data');
        return <div className="text-center p-4 text-gray-600">No damage analysis data available.</div>;
      }
    case 'cost-estimate':
      // Ensure chartData is CostData[]
      if (Array.isArray(chartData) && chartData.every(item => 'date' in item && 'cost' in item && 'type' in item)) {
        return renderTimeSeriesCostTrend();
      } else {
        return <div className="text-center p-4 text-gray-600">Cost data is not in the expected format (Array&lt;CostData&gt;).</div>;
      }
    case 'insurance-trends':
      console.log('📊 AnalysisChart: Rendering insurance-trends chart');
      return renderInsuranceTrends();
    case 'severity-breakdown':
      console.log('📊 AnalysisChart: Rendering severity-breakdown chart');
      return renderSeverityBreakdownPieChart();
    case 'coverage-breakdown':
      console.log('📊 AnalysisChart: Rendering coverage-breakdown chart');
      return renderCoverageBreakdownPieChart();
    case 'claim-status':
      console.log('📊 AnalysisChart: Rendering claim-status chart');
      return renderClaimStatusPieChart();
    case 'time-series':
      if (Array.isArray(chartData) && chartData.length > 0) {
        const firstItem = chartData[0];
        if ('count' in firstItem && 'date' in firstItem) {
          return renderTimeSeriesDamageTrend();
        } else if ('cost' in firstItem && 'date' in firstItem) {
          return renderTimeSeriesCostTrend();
        }
      }
      return <div className="text-center p-4 text-gray-600">Time-series data is not in the expected format for trends.</div>;
    default:
      // Default rendering logic based on inferred structure of chartData
      if (Array.isArray(chartData) && chartData.length > 0) {
        const firstItem = chartData[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          if ('date' in firstItem && 'count' in firstItem) {
            return renderTimeSeriesDamageTrend();
          } else if ('type' in firstItem && 'value' in firstItem) {
            return renderDamageAnalysis();
          } else if ('date' in firstItem && 'cost' in firstItem && 'type' in firstItem) {
            return renderTimeSeriesCostTrend();
          }
        }
      }
      console.log('📊 AnalysisChart: No matching chart type or data format');
      return <div className="text-center p-4 text-gray-600">Chart type not specified or data format mismatch.</div>;
  }
}
