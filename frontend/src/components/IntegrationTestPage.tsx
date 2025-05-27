/**
 * Complete integration test for the Car Damage Prediction system
 * Tests real AI integration and backend connectivity
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from './ui/badge';
import { Loader2, Upload, Zap, CheckCircle } from 'lucide-react';
import { DamageResult } from '@/types';
import { analyzeCarDamageWithAI, testApiConnectivity } from '@/utils/api/damageAnalysisApi';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  result?: any;
  error?: string;
}

const IntegrationTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const updateTestResult = (test: string, status: 'success' | 'error', result?: any, error?: string) => {
    setTestResults(prev => prev.map(t => 
      t.test === test ? { ...t, status, result, error } : t
    ));
  };
  const runIntegrationTests = async () => {
    setIsRunning(true);
    setTestResults([
      { test: 'API Connectivity', status: 'pending' },
      { test: 'AI Backend Analysis', status: 'pending' },
      { test: 'Data Structure Validation', status: 'pending' }
    ]);

    try {
      // Test 1: API Connectivity
      console.log('🧪 Testing API connectivity...');
      const apiAvailable = await testApiConnectivity();
      updateTestResult('API Connectivity', apiAvailable ? 'success' : 'error', 
        apiAvailable ? 'Backend API is accessible' : undefined,
        apiAvailable ? undefined : 'Cannot connect to backend API'
      );

      // Test 2: AI Backend Analysis (only if file is selected)
      if (selectedFile) {
        console.log('🧪 Testing AI backend analysis...');
        try {
          const aiResult = await analyzeCarDamageWithAI(selectedFile);
          updateTestResult('AI Backend Analysis', 'success', {
            damageType: aiResult.damageType,
            confidence: aiResult.confidence,
            vehicleMake: aiResult.vehicleIdentification?.make,
            regionsCount: aiResult.identifiedDamageRegions?.length || 0
          });

          // Test 3: Data Structure Validation
          const hasRequiredFields = aiResult.damageType && 
                                  aiResult.confidence !== undefined &&
                                  Array.isArray(aiResult.identifiedDamageRegions) &&
                                  aiResult.vehicleIdentification &&
                                  aiResult.enhancedRepairCost;
          
          updateTestResult('Data Structure Validation', hasRequiredFields ? 'success' : 'error',
            hasRequiredFields ? 'All required fields present' : undefined,
            hasRequiredFields ? undefined : 'Missing required data structure fields'
          );
        } catch (error) {
          updateTestResult('AI Backend Analysis', 'error', undefined, 
            error instanceof Error ? error.message : 'AI analysis failed');
          updateTestResult('Data Structure Validation', 'error', undefined, 'Cannot validate - AI analysis failed');
        }
      } else {
        updateTestResult('AI Backend Analysis', 'error', undefined, 'No image file selected');
        updateTestResult('Data Structure Validation', 'error', undefined, 'Cannot validate without AI analysis');
      }

    } catch (error) {
      console.error('Integration test error:', error);
    } finally {
      setIsRunning(false);
    }
  };
  const runSingleAnalysis = async () => {
    if (!selectedFile) return;

    setIsRunning(true);
    try {
      console.log('Running AI analysis...');
      const result = await analyzeCarDamageWithAI(selectedFile);

      console.log('Analysis result:', result);
      alert(`Analysis Complete!\nDamage Type: ${result.damageType}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\nRegions: ${result.identifiedDamageRegions?.length || 0}`);

    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <span className="h-4 w-4 text-red-500">✗</span>;
    }
  };

  const getStatusBadge = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Running...</Badge>;
      case 'success': return <Badge variant="default" className="bg-green-500">Passed</Badge>;
      case 'error': return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">🚗 AI Integration Test Dashboard</h1>
          <p className="text-gray-600">Test the complete Car Damage Prediction system integration</p>
        </div>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Image Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>            <div className="flex gap-4">
              <Button 
                onClick={runSingleAnalysis}
                disabled={!selectedFile || isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Run AI Analysis
              </Button>
              
              <Button 
                onClick={runIntegrationTests}
                disabled={isRunning}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Run Full Integration Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <h3 className="font-medium">{test.test}</h3>
                        {test.result && (
                          <p className="text-sm text-gray-600">
                            {typeof test.result === 'string' ? test.result : JSON.stringify(test.result)}
                          </p>
                        )}
                        {test.error && (
                          <p className="text-sm text-red-600">{test.error}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(test.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>                <strong>API Base URL:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}
                </code>
              </div>
              <div>
                <strong>Use Real AI:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {import.meta.env.VITE_USE_AI || 'true'}
                </code>
              </div>
              <div>
                <strong>Environment:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {import.meta.env.MODE || 'development'}
                </code>
              </div>
              <div>
                <strong>Debug Mode:</strong><br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {import.meta.env.VITE_DEBUG || 'false'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Alert>          <AlertDescription>
            <strong>Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Select a car image file using the upload button</li>
              <li>Run an AI analysis to analyze the selected image</li>
              <li>Run full integration tests to validate all system components</li>
              <li>Check the test results to ensure everything is working correctly</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default IntegrationTestPage;
