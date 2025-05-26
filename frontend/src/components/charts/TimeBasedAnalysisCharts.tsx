import React, { useContext } from 'react';
import HistoryContext, { AnalysisHistoryItem } from '@/context/HistoryContext'; // Corrected import
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnalysisChart from './AnalysisChart'; 
// DamageResult might be needed if we dive deep into item.result, but AnalysisHistoryItem should suffice for top-level properties
// import { DamageResult } from '@/types'; 

const TimeBasedAnalysisCharts: React.FC = () => {
  const historyContext = useContext(HistoryContext);

  if (!historyContext) {
    return <p>Error: History context is not available.</p>;
  }

  const { history } = historyContext; // history is of type AnalysisHistoryItem[]

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Time-Based Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No historical data available to display trends.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for Damage Trends Chart
  const damageTrendData = history.map((item: AnalysisHistoryItem) => ({
    date: new Date(item.analysisDate).toLocaleDateString(),
    count: 1, // Placeholder: This needs to be aggregated based on damage types or severity
    type: item.damageType || 'Unknown',
  }));
  
  // Prepare data for Cost Trends Chart
  const costTrendData = history.map((item: AnalysisHistoryItem) => {
    const costString = item.repairEstimate || '0';
    return {
      date: new Date(item.analysisDate).toLocaleDateString(),
      cost: parseFloat(costString.replace(/[^\d.-]/g, '')) || 0, 
      type: 'Repair Cost',
    };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Damage Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisChart type="time-series" damageData={damageTrendData} />
          <p className="text-sm text-muted-foreground mt-2">
            Note: This chart shows a simplified view. Actual implementation may require data aggregation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repair Cost Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisChart type="time-series" costData={costTrendData} />
           <p className="text-sm text-muted-foreground mt-2">
            Note: This chart shows a simplified view. Actual implementation may require data aggregation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeBasedAnalysisCharts;
