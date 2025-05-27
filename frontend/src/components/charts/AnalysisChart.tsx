import React from 'react';
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
  damageData?: DamageData[];
  insuranceData?: InsuranceData[];
  costData?: CostData[]; 
  type: 'damage-analysis' | 'cost-estimate' | 'insurance-trends' | 'severity-breakdown' | 'time-series'; 
  title?: string;
  className?: string;
}

const COLORS = {
  minor: '#4ade80', // Tailwind green-400 (brighter)
  moderate: '#facc15', // Tailwind yellow-400 (brighter)
  severe: '#f87171', // Tailwind red-400 (brighter)
  critical: '#ef4444', // Tailwind red-500 (standard)
  primary: '#60a5fa', // Tailwind blue-400 (brighter)
  secondary: '#a78bfa', // Tailwind violet-400 (brighter)
  insurance: '#22d3ee', // Tailwind cyan-400 (brighter)
  
  // Darker, more contrasting background and text for better readability
  background: 'rgba(30, 41, 59, 0.7)', // slate-800 with opacity
  text: '#f8fafc', // slate-50 (very light gray / almost white)
  grid: 'rgba(71, 85, 105, 0.5)', // slate-600 with opacity
  tooltipBorder: 'rgba(100, 116, 139, 0.7)', // slate-500 with opacity
};

const DAMAGE_COLORS = [COLORS.minor, COLORS.moderate, COLORS.severe, COLORS.critical]; // Use defined COLORS

export default function AnalysisChart({ 
  damageData = [], 
  insuranceData = [],
  costData = [], 
  type, 
  title,
  className = '' 
}: ChartProps) {
  
  // More realistic damage data with Indian context
  const sampleDamageData: DamageData[] = [
    { type: 'Scratches', severity: 2, cost: 8500, confidence: 92, area: 'Front Bumper' },
    { type: 'Dent', severity: 4, cost: 25000, confidence: 95, area: 'Rear Door' },
    { type: 'Paint Damage', severity: 3, cost: 15000, confidence: 88, area: 'Side Panel' },
    { type: 'Cracked Light', severity: 3, cost: 12000, confidence: 96, area: 'Headlight' },
    { type: 'Windshield Crack', severity: 4, cost: 18000, confidence: 97, area: 'Windshield' },
    { type: 'Bumper Damage', severity: 3, cost: 22000, confidence: 94, area: 'Rear Bumper' },
  ];

  // More realistic insurance data with Indian context
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

  const data = damageData.length > 0 ? damageData : sampleDamageData;
  const insData = insuranceData && insuranceData.length > 0 ? insuranceData : sampleInsuranceData;
  const currentCostData = costData && costData.length > 0 ? costData : []; // Use an empty array if costData is not provided

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
      <LineChart data={damageData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}> {/* Increased bottom margin for XAxis labels */}
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
            borderRadius: '8px', // Softer radius
            color: COLORS.text,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)', // Softer shadow
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add padding to legend */}
        <Line type="monotone" dataKey="count" stroke={COLORS.primary} name="Damage Occurrences" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTimeSeriesCostTrend = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={currentCostData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}> {/* Changed to AreaChart, Increased bottom margin */}
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

  const renderDamageAnalysis = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart 
        data={data} 
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        barSize={40} // Wider bars for better visibility
      >
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="type" 
          tick={{ fontSize: 12, fill: '#333' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
          angle={-30} // Angle labels to prevent overlap
          textAnchor="end" // Adjust anchor for angled labels
          height={60} // Increase height for angled labels
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#333' }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
          label={{ value: 'Severity & Cost', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: '#333',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            padding: '10px 14px',
            fontSize: '13px'
          }}
          formatter={(value, name, props) => {
            if (name === 'Severity Level') { // Match Bar name
              return [getSeverityLabel(value as number), 'Severity'];
            } else if (name === 'Estimated Cost (₹)') { // Match Bar name
              const costDisplay = typeof value === 'number' ? `₹${value.toLocaleString()}` : 'N/A';
              return [costDisplay, 'Estimated Cost (₹)'];
            } else if (name === 'Confidence (%)') { // Match Bar name
              const confidenceDisplay = typeof value === 'number' ? `${value}%` : 'N/A';
              return [confidenceDisplay, 'Confidence (%)'];
            }
            const displayValue = value !== undefined && value !== null ? String(value) : 'N/A';
            return [displayValue, String(name)];
          }}
          labelFormatter={(label) => `<strong>${label}</strong>`}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '15px' }} 
          iconType="circle"
          iconSize={10}
        />
        <Bar 
          dataKey="severity" 
          name="Severity Level"
          radius={[8, 8, 0, 0]} // More rounded bars
          fill="#8884d8" // Default fill (will be overridden by Cell)
        >
          {data.map((entry: DamageData, index: number) => (
            <Cell key={`severity-${index}`} fill={getSeverityColor(entry.severity || 0)} />
          ))}
        </Bar>
        <Bar 
          dataKey="cost" 
          name="Estimated Cost (₹)"
          radius={[8, 8, 0, 0]} // More rounded bars
          fill={COLORS.primary}
        />
        <Bar 
          dataKey="confidence" 
          name="Confidence (%)"
          radius={[8, 8, 0, 0]} // More rounded bars
          fill={COLORS.secondary}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderCostEstimate = () => ( // This is often a bar chart for comparison or line/area for trends
    <ResponsiveContainer width="100%" height={300}>
      {/* Assuming costData is more appropriate here if it's about trends, or data if comparing items */}
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
         <defs>
          <linearGradient id="colorCostEst" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="type" 
          tick={{ fontSize: 12, fill: COLORS.text }}
          angle={-30}
          textAnchor="end"
          dy={10}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: COLORS.text }}
          unit="₹" // Assuming cost is in Rupees
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: COLORS.background,
            border: `1px solid ${COLORS.tooltipBorder}`,
            borderRadius: '8px',
            color: COLORS.text,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
          }}
          formatter={(value: unknown) => { // Use unknown type for broader compatibility
            const costDisplay = typeof value === 'number' ? `₹${value.toLocaleString()}` : 'N/A';
            return [costDisplay, 'Estimated Repair Cost']; // Ensure name matches Area
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Area
          type="monotone"
          dataKey="cost"
          name="Estimated Repair Cost"
          stroke={COLORS.primary}
          fill="url(#colorCostEst)"
          strokeWidth={2}
          activeDot={{ r: 6 }}
          unit="₹"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderSeverityBreakdown = () => {
    const severityCounts = data.reduce((acc, curr) => {
      const severityLabel = getSeverityLabel(curr.severity || 0);
      acc[severityLabel] = (acc[severityLabel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(severityCounts).map(([name, value], index) => ({
      name,
      value,
      fill: DAMAGE_COLORS[index % DAMAGE_COLORS.length] // Cycle through DAMAGE_COLORS
    }));

    if (pieData.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-500">No severity data available for breakdown.</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <defs>
            {pieData.map((entry, index) => (
              <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.3" />
              </filter>
            ))}
          </defs>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            innerRadius={60} // Add inner radius for donut chart
            fill="#8884d8"
            dataKey="value"
            stroke="#fff" // White stroke for better segment definition
            strokeWidth={2}
            paddingAngle={2} // Add padding between segments
            animationDuration={1500}
            animationBegin={300}
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill} 
                filter={`url(#shadow-${index})`} // Apply shadow filter
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ddd',
              borderRadius: '8px',
              color: '#333',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '10px 14px',
              fontSize: '13px'
            }}
            formatter={(value, name, props) => {
              const entry = pieData.find(item => item.name === props.payload.name);
              if (name === 'value') {
                return [`${value} cases`, 'Count'];
              }
              return [value, name];
            }}
            itemSorter={(item) => -(item.value || 0)}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }} 
            iconType="circle"
            iconSize={10}
            formatter={(value, entry, index) => {
              // value here is the 'name' of the pie slice (e.g., 'Minor', 'Moderate')
              // entry.payload.value is the count for that slice
              const count = entry.payload && typeof entry.payload.value === 'number' ? entry.payload.value : 'N/A';
              return (
                <span style={{ color: '#333', fontSize: '13px', fontWeight: 500 }}>
                  {value} ({count} cases)
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };
  const renderInsuranceTrends = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={insData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}> {/* Increased bottom margin for XAxis labels */}
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12, fill: COLORS.text }}
          angle={-30} // Angle labels
          textAnchor="end" // Adjust anchor for angled labels
          dy={10} // Nudge labels down
        />
        <YAxis 
          yAxisId="left"
          tick={{ fontSize: 12, fill: '#333' }}
          tickLine={{ stroke: '#888' }}
          axisLine={{ stroke: '#888' }}
          label={{ value: 'Number of Claims', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 13 } }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: '#333' }}
          tickLine={{ stroke: '#888' }}
          axisLine={{ stroke: '#888' }}
          label={{ value: 'Average Cost (₹)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#666', fontSize: 13 } }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ddd',
            borderRadius: '8px',
            color: '#333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '10px 14px',
            fontSize: '13px'          }}          
          formatter={(value: unknown, name: string) => {
            if (name === 'Average Cost (₹)') {
              const costDisplay = typeof value === 'number' ? `₹${value.toLocaleString()}` : 'N/A';
              return [costDisplay as React.ReactNode, name];
            }
            return [value as React.ReactNode, name];
          }}
          labelFormatter={(label) => `<strong>${label}</strong>`}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }} 
          iconType="circle"
          iconSize={10}
        />
        <Bar 
          yAxisId="left"
          dataKey="claims" 
          name="Claims Filed" 
          fill="url(#colorClaims)" 
          radius={[4, 4, 0, 0]} 
          stroke="#3b82f6"
          strokeWidth={1}
        />
        <Bar 
          yAxisId="left"
          dataKey="settlements" 
          name="Settlements" 
          fill="url(#colorSettlements)" 
          radius={[4, 4, 0, 0]} 
          stroke="#22c55e"
          strokeWidth={1}
        />
        <Bar 
          yAxisId="right"
          dataKey="averageCost" 
          name="Average Cost (₹)" 
          fill="url(#colorAvgCost)" 
          radius={[4, 4, 0, 0]} 
          stroke="#8b5cf6"
          strokeWidth={1}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  switch (type) {
    case 'damage-analysis':
      return renderDamageAnalysis();
    case 'cost-estimate':
      return renderCostEstimate();
    case 'insurance-trends':
      return renderInsuranceTrends();
    case 'severity-breakdown':
      return renderSeverityBreakdown();
    case 'time-series':
      if (costData && costData.length > 0) {
        return renderTimeSeriesCostTrend();
      }
      return renderTimeSeriesDamageTrend(); 
    default:
      // It might be better to return null or a specific error component
      return <div className={className}><p className="text-red-500">Invalid chart type: {type}</p></div>;
  }
}
