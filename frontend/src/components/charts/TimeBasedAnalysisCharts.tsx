import React, { useContext } from 'react';
// import HistoryContext, { AnalysisHistoryItem } from '@/context/HistoryContext'; // No longer needed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnalysisChart from './AnalysisChart'; 
// DamageResult might be needed if we dive deep into item.result, but AnalysisHistoryItem should suffice for top-level properties
// import { DamageResult } from '@/types'; 

interface TimeBasedAnalysisChartsProps {
  data: Array<{ date: string; count: number }>;
}

const TimeBasedAnalysisCharts: React.FC<TimeBasedAnalysisChartsProps> = ({ data }) => {
  
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-medium text-gray-800">Time-Based Analysis</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-gray-500 text-center py-8">No historical data available to display trends.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for Damage Trends Chart (now passed as prop)
  const damageTrendData = data.map(item => ({
    date: item.date,
    count: item.count,
    type: 'Damage Count', // Simplified for this chart component
  }));
  
 // Cost trend data would need to be prepared similarly if this chart were to show it
  // For now, this component focuses on damage counts over time based on the `data` prop.
  return (
    <div className="space-y-4">
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-medium text-gray-800">Damage Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px]">
            <AnalysisChart type="time-series" data={damageTrendData} />
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Analysis based on {data.length} historical records
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeBasedAnalysisCharts;
