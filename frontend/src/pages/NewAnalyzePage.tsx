import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Image as ImageIcon,
  Camera,
  FileImage,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Share2,
  X,
  ZoomIn,
  MapPin
} from 'lucide-react';
import DamageAnalyzer from '@/components/damage/DamageAnalyzer';
import { DamageResult } from '@/types';

interface AnalysisState {
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
}

const NewAnalyzePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisStart = useCallback(() => {
    console.log('Analysis started by child component');
    setAnalysisState({ status: 'analyzing', progress: 50, message: 'AI is analyzing the image...' });
  }, []);

  const handleAnalysisComplete = useCallback((result: DamageResult) => {
    console.log('Analysis complete:', result);
    setIsAnalyzing(false);
    setAnalysisState({ status: 'complete', progress: 100, message: 'Analysis complete!' });
  }, []);

  const handleAnalysisError = useCallback((errorMessage: string) => {
    console.error('Analysis error:', errorMessage);
    setIsAnalyzing(false);
    setAnalysisState({ status: 'error', progress: 0, message: errorMessage });
  }, []);

  const handleBack = useCallback(() => {
    setShowAnalyzer(false);
    setSelectedFile(null);
    setPreview(null);
    setIsAnalyzing(false);
    setAnalysisState({ status: 'idle', progress: 0, message: '' });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisState({
        status: 'error',
        progress: 0,
        message: 'Please select a valid image file'
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setShowAnalyzer(true);
      // Set isAnalyzing to true to trigger the analysis in the child component
      setIsAnalyzing(true); 
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setShowAnalyzer(false);
    setIsAnalyzing(false);
    setAnalysisState({
      status: 'idle',
      progress: 0,
      message: ''
    });
  };

  const uploadMethods = [
    {
      icon: <Upload className="w-8 h-8" />,
      title: "Drag & Drop",
      description: "Drop your image here",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <FileImage className="w-8 h-8" />,
      title: "Browse Files",
      description: "Select from computer",
      color: "from-purple-500 to-indigo-500"
    },
    {
      icon: <Camera className="w-8 h-8" />,
      title: "Take Photo",
      description: "Use camera directly",
      color: "from-emerald-500 to-teal-500"
    }
  ];

  const guidelines = [
    "Ensure good lighting and clear visibility",
    "Capture the entire damaged area",
    "Take photos from multiple angles if possible",
    "Avoid blurry or dark images"
  ];

  if (showAnalyzer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={clearSelection}
              className="mb-4 gap-2"
            >
              <X className="w-4 h-4" />
              Clear & Upload New
            </Button>
          </div>

          {/* Analyzer Component */}
          <DamageAnalyzer 
            imageFile={selectedFile}
            onBack={handleBack}
            onAnalysisStart={handleAnalysisStart}
            onAnalysisComplete={handleAnalysisComplete}
            onAnalysisError={handleAnalysisError}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            AI-Powered Analysis
          </Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Analyze Vehicle Damage
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Upload an image of your vehicle damage and get instant AI-powered analysis with detailed cost estimates
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8 border-2 border-dashed hover:border-purple-300 transition-all duration-300 hover:shadow-xl">
          <CardContent className="p-12">
            <div
              className={`relative ${dragActive ? 'bg-purple-50' : ''} transition-colors duration-200 rounded-xl`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />

              {!preview ? (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-purple-600" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Upload Vehicle Image
                  </h3>
                  <p className="text-slate-600 mb-8">
                    Drag and drop your image here, or click to browse
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {uploadMethods.map((method, index) => (
                      <div
                        key={index}
                        className={`p-6 rounded-xl bg-gradient-to-br ${method.color} bg-opacity-10 border-2 border-transparent hover:border-purple-300 transition-all cursor-pointer`}
                        onClick={() => {
                          if (index === 1) document.getElementById('file-upload')?.click();
                        }}
                      >
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-white`}>
                          {method.icon}
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">{method.title}</h4>
                        <p className="text-sm text-slate-600">{method.description}</p>
                      </div>
                    ))}
                  </div>

                  <label htmlFor="file-upload">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 cursor-pointer gap-2"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <Upload className="w-5 h-5" />
                      Choose File
                    </Button>
                  </label>

                  <p className="text-sm text-slate-500 mt-4">
                    Supports: JPG, PNG, WEBP (Max 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearSelection}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
                      onClick={() => setShowAnalyzer(true)}
                    >
                      <Sparkles className="w-5 h-5" />
                      Start Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={clearSelection}
                      className="gap-2"
                    >
                      <X className="w-5 h-5" />
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Photo Guidelines
              </CardTitle>
              <CardDescription>Tips for best results</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {guidelines.map((guideline, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700">{guideline}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                What You'll Get
              </CardTitle>
              <CardDescription>Comprehensive analysis includes</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Damage Mapping</span>
                    <p className="text-sm text-slate-600">Precise location of all damage areas</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ZoomIn className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">AI Classification</span>
                    <p className="text-sm text-slate-600">Accurate damage type identification</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Cost Estimation</span>
                    <p className="text-sm text-slate-600">Detailed repair cost breakdown</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Share2 className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Exportable Report</span>
                    <p className="text-sm text-slate-600">PDF report ready for insurance</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Privacy Notice:</strong> Your images are processed securely and are not stored permanently. 
            Analysis data is retained for your account history only.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default NewAnalyzePage;
