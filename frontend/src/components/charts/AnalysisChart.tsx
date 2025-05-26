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
  minor: '#10b981',
  moderate: '#f59e0b', 
  severe: '#ef4444',
  critical: '#dc2626',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  insurance: '#06b6d4',
  background: 'rgba(255, 255, 255, 0.1)',
  text: '#ffffff', // Assuming a dark theme context for these charts
  grid: 'rgba(255, 255, 255, 0.2)',
};

const DAMAGE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#7c2d12'];

export default function AnalysisChart({ 
  damageData = [], 
  insuranceData = [],
  costData = [], 
  type, 
  title,
  className = '' 
}: ChartProps) {
  
  const sampleDamageData: DamageData[] = [
    { type: 'Scratches', severity: 2, cost: 350, confidence: 85, area: 'Front Bumper' },
    { type: 'Dent', severity: 4, cost: 1200, confidence: 92, area: 'Rear Door' },
    { type: 'Paint Damage', severity: 3, cost: 800, confidence: 78, area: 'Side Panel' },
    { type: 'Cracked Light', severity: 3, cost: 450, confidence: 95, area: 'Headlight' },
  ];

  const sampleInsuranceData: InsuranceData[] = [
    { month: 'Jan', claims: 245, averageCost: 2340, settlements: 220 },
    { month: 'Feb', claims: 198, averageCost: 2680, settlements: 185 },
    { month: 'Mar', claims: 267, averageCost: 2120, settlements: 245 },
    { month: 'Apr', claims: 223, averageCost: 2890, settlements: 201 },
    { month: 'May', claims: 189, averageCost: 3150, settlements: 175 },
    { month: 'Jun', claims: 301, averageCost: 2750, settlements: 278 },
  ];

  const data = damageData.length > 0 ? damageData : sampleDamageData;
  const insData = insuranceData.length > 0 ? insuranceData : sampleInsuranceData;

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
      <LineChart data={damageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.text }} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="count" stroke={COLORS.primary} name="Damage Occurrences" />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTimeSeriesCostTrend = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={costData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.text }} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} unit="₹" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
          }}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Cost']}
        />
        <Legend />
        <Line type="monotone" dataKey="cost" stroke={COLORS.secondary} name="Repair Cost" unit="₹" />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderDamageAnalysis = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="type" 
          tick={{ fontSize: 12, fill: COLORS.text }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: COLORS.text }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
          formatter={(value, name) => [
            name === 'severity' ? getSeverityLabel(value as number) : value,
            name === 'severity' ? 'Severity' : name === 'confidence' ? 'Confidence %' : 'Estimated Cost ($)'
          ]}
        />
        <Bar 
          dataKey="severity" 
          fill={COLORS.primary}
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry: DamageData, index: number) => (
            <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity || 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
  const renderCostEstimate = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis 
          dataKey="type" 
          tick={{ fontSize: 12, fill: COLORS.text }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: COLORS.text }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={{ stroke: COLORS.grid }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
          formatter={(value: number) => [`$${value}`, 'Estimated Cost']}
        />
        <Area 
          type="monotone" 
          dataKey="cost" 
          stroke={COLORS.primary}
          fill={COLORS.primary}
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderInsuranceTrends = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={insData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12, fill: COLORS.text }} // Added fill for consistency
          className="text-secondary-600"
        />
        <YAxis 
          tick={{ fontSize: 12, fill: COLORS.text }} // Added fill for consistency
          className="text-secondary-600"
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)', // Changed to dark theme
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend wrapperStyle={{ color: COLORS.text }} /> // Added text color for legend
        <Line 
          type="monotone" 
          dataKey="claims" 
          stroke={COLORS.insurance} 
          activeDot={{ r: 8 }}
        />
        <Line 
          type="monotone" 
          dataKey="settlements" 
          stroke={COLORS.primary} 
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderSeverityBreakdown = () => {
    const severityCounts = data.reduce((acc: {[key: string]: number}, curr: DamageData) => {
      const severityLabel = getSeverityLabel(curr.severity || 0);
      acc[severityLabel] = (acc[severityLabel] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.keys(severityCounts).map(key => ({
      name: key,
      value: severityCounts[key],
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry: {name: string; value: number}, index: number) => (
              <Cell key={`cell-${index}`} fill={DAMAGE_COLORS[index % DAMAGE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: '#ffffff',
            }}
          />
          <Legend wrapperStyle={{ color: COLORS.text }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

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
