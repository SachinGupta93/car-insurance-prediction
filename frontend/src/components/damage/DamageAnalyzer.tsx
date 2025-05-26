import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DamageResult, DamageRegion } from '@/types'; // Ensure DamageRegion is imported
import { VehicleIdentificationCard } from './VehicleIdentificationCard';
import { RepairCostCard } from './RepairCostCard';
import { InsuranceRecommendationsCard } from './InsuranceRecommendationsCard';
import AnalysisVisualization from '../AnalysisVisualization';

// Import with relative path
import { simulateEnhancedAnalysisRequest } from '../../utils/mockData/damageAnalysis';
interface DamageAnalyzerProps {
  imageFile: File | null;
  onBack: () => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: DamageResult) => void;
  onAnalysisError: (errorMessage: string) => void;
  isAnalyzing: boolean; 
  abortSignal?: AbortSignal; 
}

const DamageAnalyzer: React.FC<DamageAnalyzerProps> = ({
  imageFile,
  onBack,
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  isAnalyzing, 
  abortSignal
  }) => {
  const [analysisResult, setAnalysisResult] = useState<DamageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[DamageAnalyzer.tsx] Props received - isAnalyzing:', isAnalyzing, 'imageFile:', imageFile);

    if (imageFile && isAnalyzing) {
      onAnalysisStart();
      setError(null);
      setAnalysisResult(null);

      // Helper function to parse identifiedDamageRegions from raw text (if necessary)
      const parseDamageRegions = (rawText: string): DamageRegion[] => {
        try {
          const match = rawText.match(/identifiedDamageRegions\s*:\s*(\[[\s\S]*?\])/);
          if (match && match[1]) {
            const regions = JSON.parse(match[1]);
            if (Array.isArray(regions) && regions.every(r => 
                typeof r.x === 'number' && typeof r.y === 'number' &&
                typeof r.width === 'number' && typeof r.height === 'number' &&
                typeof r.damageType === 'string' && typeof r.confidence === 'number'
            )) {
              return regions;
            }
          }
          console.warn('[DamageAnalyzer.tsx] Could not parse identifiedDamageRegions from raw text or structure is invalid.');
          return [];
        } catch (e) {
          console.error('[DamageAnalyzer.tsx] Error parsing identifiedDamageRegions:', e);
          return [];
        }
      };

      simulateEnhancedAnalysisRequest(URL.createObjectURL(imageFile), abortSignal)
        .then((result: DamageResult) => {
          console.log('[DamageAnalyzer.tsx] Raw analysis result from simulateEnhancedAnalysisRequest:', result);

          let finalRegions: DamageRegion[] = [];

          // Check if identifiedDamageRegions is already an array (as per updated mock data and ideal API response)
          if (Array.isArray(result.identifiedDamageRegions)) {
            finalRegions = result.identifiedDamageRegions;
          } else if (typeof result.description === 'string') {
            // Fallback: Attempt to parse from description if not directly available as an array
            // This is less ideal and depends on the AI embedding the JSON string in the description.
            // The prompt to the AI requests a dedicated `identifiedDamageRegions` field.
            console.log('[DamageAnalyzer.tsx] identifiedDamageRegions not an array, attempting to parse from description.');
            parsedRegions = parseDamageRegions(result.description);
            if (parsedRegions.length > 0) {
                finalRegions = parsedRegions;
            } else {
                console.warn('[DamageAnalyzer.tsx] No damage regions found or parsed from description.');
            }
          } else {
            console.warn('[DamageAnalyzer.tsx] No valid identifiedDamageRegions found in the result.');
          }

          const processedResult: DamageResult = {
            ...result,
            identifiedDamageRegions: finalRegions, // Ensure this is always an array
          };

          console.log('[DamageAnalyzer.tsx] Processed analysis complete with regions:', processedResult);
          setAnalysisResult(processedResult);
          onAnalysisComplete(processedResult);
        })
        .catch((err: any) => {
          if (err.name === 'AbortError') {
            console.log('[DamageAnalyzer.tsx] Analysis aborted');
            setError('Analysis was cancelled.');
            onAnalysisError('Analysis was cancelled.');
          } else {
            console.error('[DamageAnalyzer.tsx] Error during analysis:', err);
            setError('Failed to analyze image. Please try again.');
            onAnalysisError('Failed to analyze image. Please try again.');
          }
        });
    } else if (!isAnalyzing && analysisResult) {
      // Analysis stopped or completed, parent handles UI changes
    } else if (!imageFile) {
        setAnalysisResult(null);
        setError(null);
    }
  }, [imageFile, isAnalyzing, onAnalysisStart, onAnalysisComplete, onAnalysisError, abortSignal, analysisResult]); // Added analysisResult to dependencies to handle re-renders if it changes externally, though it might not be necessary based on current logic.

  if (!imageFile) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No image selected for analysis.</p>
        <Button onClick={onBack} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (isAnalyzing && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Analyzing image...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onBack} className="mt-4">Try Again</Button>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="p-4 text-center">
        {/* This state is valid if analysis hasn't started or was cancelled before completion */}
      </div>
    );
  }

  // Ensure identifiedRegions is always an array, even if undefined in analysisResult
  const identifiedRegions: DamageRegion[] = analysisResult?.identifiedDamageRegions || [];
  console.log('[DamageAnalyzer.tsx] Regions being passed to AnalysisVisualization:', identifiedRegions);


  return (
    <div className="p-4 space-y-6">
      {imageFile && (
        <Card>
          <CardHeader>
            <CardTitle>Image Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-full h-auto md:h-96"> 
              <AnalysisVisualization 
                imageUrl={URL.createObjectURL(imageFile)}
                damageRegions={identifiedRegions} 
                showOverlay={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analysis Result</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p><strong>Damage Type:</strong> {analysisResult.damageType}</p>
              <p><strong>Confidence:</strong> {(analysisResult.confidence * 100).toFixed(1)}%</p>
              <p><strong>Description:</strong> {analysisResult.damageDescription}</p>
            </div>
            
            {analysisResult.recommendations && (
              <div>
                <h4 className="font-semibold mb-2">Recommendations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {analysisResult.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {analysisResult.vehicleIdentification && (
        <VehicleIdentificationCard vehicleInfo={analysisResult.vehicleIdentification} />
      )}

      {analysisResult.enhancedRepairCost && (
        <RepairCostCard 
          repairCost={analysisResult.enhancedRepairCost} 
          damageType={analysisResult.damageType}
        />
      )}

      {analysisResult.insuranceProviders && analysisResult.insuranceProviders.length > 0 && (
        <InsuranceRecommendationsCard 
          providers={analysisResult.insuranceProviders}
          regionalInsights={analysisResult.regionalInsights}
        />
      )}

      <Button onClick={onBack} variant="outline">Back to Upload</Button>
    </div>
  );
};

export default DamageAnalyzer;