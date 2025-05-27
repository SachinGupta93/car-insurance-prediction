import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DamageResult, DamageRegion } from '@/types'; // Ensure DamageRegion is imported
import { VehicleIdentificationCard } from './VehicleIdentificationCard';
import { RepairCostCard } from './RepairCostCard';
import { InsuranceRecommendationsCard } from './InsuranceRecommendationsCard';
import AnalysisVisualization from '../AnalysisVisualization';

// Import the AI-powered analysis function
import { analyzeCarDamageWithAI } from '../../utils/api/damageAnalysisApi';
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const lastAnalyzedFileKey = useRef<string | null>(null);
  
  // Effect to manage blob URL lifecycle
  useEffect(() => {
    if (imageFile) {
      // Create new blob URL
      const url = URL.createObjectURL(imageFile);
      setBlobUrl(url);
      
      // Return cleanup function to revoke URL when component unmounts or imageFile changes
      return () => {
        URL.revokeObjectURL(url);
        setBlobUrl(null);
      };
    }
  }, [imageFile]);
  const isAnalysisInProgress = useRef<boolean>(false);
  const hasAnalysisBeenTriggered = useRef<boolean>(false);
  const currentAnalysisFileKey = useRef<string | null>(null);
  const analysisInitiatedForFile = useRef<string | null>(null);
  const processedCombinations = useRef<Set<string>>(new Set());

  // Create a unique key for the file to avoid duplicate processing
  const getFileKey = useCallback((file: File) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  const performAnalysis = useCallback(async (file: File, signal?: AbortSignal) => {
    const fileKey = getFileKey(file);
    
    // Multiple prevention checks
    if (isAnalysisInProgress.current) {
      console.log('🚫 Preventing duplicate analysis: Analysis already in progress');
      return;
    }

    if (currentAnalysisFileKey.current === fileKey) {
      console.log('🚫 Preventing duplicate analysis: This file analysis is already in progress');
      return;
    }

    if (lastAnalyzedFileKey.current === fileKey) {
      console.log('🚫 Preventing duplicate analysis: This file has already been analyzed');
      return;
    }

    if (analysisInitiatedForFile.current === fileKey) {
      console.log('🚫 Preventing duplicate analysis: Analysis already initiated for this file');
      return;
    }

    // Set all prevention flags
    isAnalysisInProgress.current = true;
    hasAnalysisBeenTriggered.current = true;
    currentAnalysisFileKey.current = fileKey;
    analysisInitiatedForFile.current = fileKey;
    
    console.log('[DamageAnalyzer.tsx] Starting analysis for file:', file.name);

    try {
      onAnalysisStart();
      setError(null);
      setAnalysisResult(null);

      console.log('[DamageAnalyzer.tsx] Analysis mode: AI Backend');

      // Only use real AI analysis - no mock data
      const result = await analyzeCarDamageWithAI(file, signal);
      
      console.log('[DamageAnalyzer.tsx] Analysis result received:', result);
      console.log('[DamageAnalyzer.tsx] identifiedDamageRegions:', result.identifiedDamageRegions);

      // Ensure identifiedDamageRegions is always an array and prepare the result
      const processedResult: DamageResult = {
        ...result,
        // Always include identifiedDamageRegions even if empty
        identifiedDamageRegions: Array.isArray(result.identifiedDamageRegions) 
          ? result.identifiedDamageRegions 
          : [],
        // Make sure we have a description even with low confidence
        damageDescription: result.damageDescription || 
          `Analyzed image with ${(result.confidence * 100).toFixed(1)}% confidence. ${result.damageType}`,
        // Ensure we always have a damage type
        damageType: result.damageType || "Analysis Complete",
      };

      console.log('[DamageAnalyzer.tsx] Analysis complete with processed regions:', processedResult);
      setAnalysisResult(processedResult);
      onAnalysisComplete(processedResult);
      lastAnalyzedFileKey.current = fileKey;
      
      // Log successful completion with more details
      console.log('[DamageAnalyzer.tsx] ✅ Analysis successfully completed!');
      console.log('[DamageAnalyzer.tsx] - Damage Type:', processedResult.damageType);
      console.log('[DamageAnalyzer.tsx] - Confidence:', (processedResult.confidence * 100).toFixed(1) + '%');
      console.log('[DamageAnalyzer.tsx] - Description length:', processedResult.description.length);
      console.log('[DamageAnalyzer.tsx] - Regions found:', processedResult.identifiedDamageRegions.length);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[DamageAnalyzer.tsx] Analysis aborted');
        setError('Analysis was cancelled.');
        onAnalysisError('Analysis was cancelled.');
      } else {
        console.error('[DamageAnalyzer.tsx] Error during analysis:', err);
        setError('Failed to analyze image. Please try again.');
        onAnalysisError('Failed to analyze image. Please try again.');
      }
    } finally {
      isAnalysisInProgress.current = false;
      currentAnalysisFileKey.current = null;
      // Keep analysisInitiatedForFile.current to prevent re-initiation
    }
  }, [onAnalysisStart, onAnalysisComplete, onAnalysisError, getFileKey]);

  useEffect(() => {
    console.log('[DamageAnalyzer.tsx] Props received - isAnalyzing:', isAnalyzing, 'imageFile:', imageFile?.name);

    // Only proceed if we have an image file and analysis is requested
    if (!imageFile || !isAnalyzing) {
      return;
    }

    const fileKey = getFileKey(imageFile);
    
    // Create a unique combination key for this file + analyzing state
    const combinationKey = `${fileKey}-analyzing-${isAnalyzing}`;
    
    // Check if this exact combination has already been processed
    if (processedCombinations.current.has(combinationKey)) {
      console.log('🚫 Preventing duplicate analysis: This file+state combination already processed');
      return;
    }
    
    // Reset analysis trigger flag when a new file is provided
    if (lastAnalyzedFileKey.current !== fileKey) {
      hasAnalysisBeenTriggered.current = false;
      analysisInitiatedForFile.current = null;
      // Clear processed combinations for new file
      processedCombinations.current.clear();
      console.log('[DamageAnalyzer.tsx] New file detected, resetting trigger flag for:', imageFile.name);
    }

    // Only start analysis if not already triggered and not in progress
    if (!hasAnalysisBeenTriggered.current && 
        !isAnalysisInProgress.current && 
        currentAnalysisFileKey.current !== fileKey &&
        lastAnalyzedFileKey.current !== fileKey &&
        analysisInitiatedForFile.current !== fileKey) {
      
      // Mark this combination as processed BEFORE starting analysis
      processedCombinations.current.add(combinationKey);
      
      console.log('[DamageAnalyzer.tsx] Conditions met, starting analysis for:', imageFile.name);
      // Call performAnalysis directly without dependency issues
      performAnalysis(imageFile, abortSignal);
    } else {
      // Log why we're not starting analysis
      if (hasAnalysisBeenTriggered.current) {
        console.log('🚫 Preventing duplicate analysis: Analysis already triggered for this session');
      } else if (isAnalysisInProgress.current) {
        console.log('🚫 Preventing duplicate analysis: Analysis already in progress');
      } else if (currentAnalysisFileKey.current === fileKey) {
        console.log('🚫 Preventing duplicate analysis: This file analysis is already in progress');
      } else if (lastAnalyzedFileKey.current === fileKey) {
        console.log('🚫 Preventing duplicate analysis: This file has already been analyzed');
      } else if (analysisInitiatedForFile.current === fileKey) {
        console.log('🚫 Preventing duplicate analysis: Analysis already initiated for this file');
      }
    }

    // Cleanup function to reset analysis state when component unmounts
    return () => {
      isAnalysisInProgress.current = false;
      currentAnalysisFileKey.current = null;
      // Don't reset analysisInitiatedForFile here to maintain prevention across re-renders
    };
  }, [imageFile, isAnalyzing, abortSignal]); // Removed getFileKey and performAnalysis from dependencies

  // Remove performAnalysis from dependencies to prevent re-creation loops

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
        <p className="text-muted-foreground">Waiting for analysis results...</p>
        {/* This state is valid if analysis hasn't started or was cancelled before completion */}
      </div>
    );
  }

  // Ensure identifiedRegions is always an array, even if undefined in analysisResult
  const identifiedRegions: DamageRegion[] = analysisResult?.identifiedDamageRegions || [];
  console.log('[DamageAnalyzer.tsx] Regions being passed to AnalysisVisualization:', identifiedRegions);
  
  return (
    <div className="p-4 space-y-6">
      {imageFile && blobUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Image Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-full h-auto md:h-96"> 
              <AnalysisVisualization 
                imageUrl={blobUrl}
                damageRegions={identifiedRegions} 
                showOverlay={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Damage Assessment */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Primary Damage Assessment
                {analysisResult.confidence < 0.5 && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Low Confidence
                  </span>
                )}
              </h3>
              
              {/* Add notice for low confidence results */}
              {analysisResult.confidence < 0.5 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-yellow-800 text-sm">
                      <strong>Low Confidence Analysis:</strong> The AI analysis has low confidence ({(analysisResult.confidence * 100).toFixed(1)}%). 
                      Consider uploading a clearer image with better lighting and closer view of any damage.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-700 mb-1">Damage Type</h4>
                  <p className="text-lg font-bold text-blue-600">{analysisResult.damageType}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-700 mb-1">Confidence Level</h4>
                  <p className="text-lg font-bold text-green-600">{(analysisResult.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-700 mb-1">Severity</h4>
                  <p className={`text-lg font-bold ${
                    analysisResult.confidence > 0.8 ? 'text-red-600' : 
                    analysisResult.confidence > 0.6 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {analysisResult.confidence > 0.8 ? 'High' : 
                     analysisResult.confidence > 0.6 ? 'Medium' : 'Low'}
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-gray-700 mb-2">Detailed Description</h4>
                <p className="text-gray-800 leading-relaxed">{analysisResult.damageDescription}</p>
              </div>
            </div>

            {/* Full Gemini Analysis - Always show this section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Complete Gemini AI Analysis
                </h3>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="space-y-4">
                    {analysisResult.description.split('\n').map((line, index) => {
                      const trimmedLine = line.trim();
                      
                      // Skip empty lines
                      if (!trimmedLine) return null;
                      
                      // Main section headers (with emojis)
                      if (trimmedLine.match(/^🔍|^📋|^💰|^🏢|^⚠️|^📊|^🎯/)) {
                        return (
                          <div key={index} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 mt-6 first:mt-0">
                            <h4 className="text-lg font-bold flex items-center">
                              <span className="text-2xl mr-3">{trimmedLine.charAt(0)}</span>
                              {trimmedLine.substring(2)}
                            </h4>
                          </div>
                        );
                      }
                      
                      // Sub-section headers
                      if (trimmedLine.match(/^[A-Z][A-Z\s&-]+:$/) && trimmedLine.length < 50) {
                        return (
                          <div key={index} className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg p-3 mt-4 border-l-4 border-indigo-500">
                            <h5 className="font-bold text-indigo-800 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              {trimmedLine}
                            </h5>
                          </div>
                        );
                      }
                      
                      // Insurance provider names (with 🏛️)
                      if (trimmedLine.startsWith('🏛️')) {
                        return (
                          <div key={index} className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 mt-3 border-l-4 border-green-500">
                            <h6 className="font-semibold text-green-800 flex items-center">
                              <span className="text-lg mr-2">🏛️</span>
                              {trimmedLine.substring(3)}
                            </h6>
                          </div>
                        );
                      }
                      
                      // Bullet points and lists
                      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                        return (
                          <div key={index} className="flex items-start ml-4 mt-2">
                            <span className="text-blue-500 mr-3 mt-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-gray-700 leading-relaxed">{trimmedLine.substring(1).trim()}</span>
                          </div>
                        );
                      }
                      
                      // Cost estimates (with ₹ or $)
                      if (trimmedLine.includes('₹') || trimmedLine.includes('$')) {
                        return (
                          <div key={index} className="bg-yellow-50 rounded-lg p-3 mt-2 border border-yellow-200">
                            <span className="text-yellow-800 font-medium flex items-center">
                              <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              {trimmedLine}
                            </span>
                          </div>
                        );
                      }
                      
                      // Regular text lines
                      if (trimmedLine) {
                        return (
                          <div key={index} className="text-gray-700 leading-relaxed pl-2 mt-1">
                            {trimmedLine}
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              </div>

            {/* Damage Regions Details */}
            {identifiedRegions && identifiedRegions.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Identified Damage Regions ({identifiedRegions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {identifiedRegions.map((region, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-400">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">Region {index + 1}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          region.confidence > 0.8 ? 'bg-red-100 text-red-800' :
                          region.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {(region.confidence * 100).toFixed(0)}% confident
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2"><strong>Type:</strong> {region.damageType}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Location:</strong> ({region.x}, {region.y}) - {region.width}×{region.height}px
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysisResult.recommendations && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Expert Recommendations
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <ul className="space-y-3">
                    {analysisResult.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-800">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {analysisResult.claimStrategy && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Insurance Claim Strategy
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Recommended Action</h4>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {analysisResult.claimStrategy.recommended.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Success Probability</h4>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{width: `${(analysisResult.confidence * 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {(analysisResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Strategic Reasoning</h4>
                    <p className="text-gray-800 bg-gray-50 rounded-lg p-3">{analysisResult.claimStrategy.reasoning}</p>
                  </div>
                  
                  {analysisResult.claimStrategy.documentationRequired && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Required Documentation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {analysisResult.claimStrategy.documentationRequired.map((doc, i) => (
                          <div key={i} className="flex items-center bg-gray-50 rounded-lg p-2">
                            <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-700">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {analysisResult.safetyAssessment && (
              <div className={`rounded-lg p-6 border-2 ${
                analysisResult.safetyAssessment.drivability === 'SAFE' 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                  : analysisResult.safetyAssessment.drivability === 'CAUTION'
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
              }`}>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Vehicle Safety Assessment
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900">Drivability Status:</span>
                    <span className={`px-4 py-2 rounded-full text-lg font-bold ${
                      analysisResult.safetyAssessment.drivability === 'SAFE' 
                        ? 'bg-green-100 text-green-800' 
                        : analysisResult.safetyAssessment.drivability === 'CAUTION'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {analysisResult.safetyAssessment.drivability}
                    </span>
                  </div>
                  
                  {analysisResult.safetyAssessment.safetySystemImpacts && analysisResult.safetyAssessment.safetySystemImpacts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Safety System Impacts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {analysisResult.safetyAssessment.safetySystemImpacts.map((impact, i) => (
                          <div key={i} className="flex items-center bg-gray-50 rounded-lg p-3">
                            <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-gray-800">{impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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