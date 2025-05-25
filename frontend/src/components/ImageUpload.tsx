import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useHistory } from '@/context/HistoryContext';
import { ApiResponse, DamageResult } from '@/types';
import DamageAnalyzer from './damage/DamageAnalyzer';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string, analysisResult: DamageResult) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded }) => {
  const { firebaseUser, loadingAuth } = useFirebaseAuth();
  const { addAnalysisToHistory } = useHistory();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DamageResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Ref to abort controller for cancelling upload
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);  const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!firebaseUser && !loadingAuth) {
      setError('You must be logged in to upload images.');
      return;
    }

    // Create a preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
    
  }, [firebaseUser, loadingAuth]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading || loadingAuth || !firebaseUser,
  });

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setError('Upload cancelled.');
    setPreview(null);
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setProgress(0);
  };
  
  const handleRemovePreview = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setAnalysisResult(null);
  };

  const handleAnalysisComplete = (result: DamageResult) => {
    setAnalysisResult(result);
    if (onImageUploaded && preview) {
      onImageUploaded(preview, result);
    }
  };

  const handleAnalysisError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleAnalysisStart = () => {
    setUploading(true);
    setProgress(0);
  };

  return (
    <div className="bg-white shadow-xl sm:rounded-lg transition-all duration-300 ease-in-out hover:shadow-2xl">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-xl font-semibold leading-7 text-gray-900 mb-1">
          Upload & Analyze Car Image
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Get an AI-powered damage assessment. Supports JPG, PNG, JPEG up to 10MB.
        </p>        {!firebaseUser && !loadingAuth && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
            Please log in to upload and analyze images.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 transition-opacity duration-300">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {preview && !uploading && !error && !analysisResult && (
           <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 transition-opacity duration-300">
            Image ready for analysis. Click "Analyze Now" or drop a new image to replace.
          </div>
        )}

        <div className="mt-2">
          {!preview ? (            <div
              {...getRootProps()}
              className={`flex flex-col justify-center items-center px-6 py-10 border-2 border-dashed rounded-lg transition-all duration-200 ease-in-out
                ${isDragActive ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-gray-300 hover:border-gray-400'}
                ${(uploading || loadingAuth || !firebaseUser) ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}
            >
              <input {...getInputProps()} />
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="mt-2 block text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop the image here ...' : 'Drag & drop an image, or click to select'}
              </span>
              <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
            </div>
          ) : (
            <div className="mb-4 text-center">
              <div className="relative inline-block group">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-72 mx-auto rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ease-in-out group-hover:shadow-xl" 
                />
                {!uploading && (
                  <button
                    onClick={handleRemovePreview}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-indigo-700">Analyzing image...</span>
                <span className="text-sm font-medium text-indigo-700">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <button
                onClick={handleCancelUpload}
                className="mt-3 w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Cancel Upload
              </button>
            </div>
          )}        {!uploading && preview && !analysisResult && !error && (
            <button              onClick={() => {
                if (selectedFile) {
                  setUploading(true);
                  // When clicked, we'll pass the selectedFile to the DamageAnalyzer
                  // by updating the state which will trigger the useEffect in DamageAnalyzer
                }
              }}
              disabled={!selectedFile || loadingAuth || !firebaseUser}
              className="mt-4 w-full px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              Analyze Image
            </button>
          )}
        </div>

        {/* Damage Analyzer Component */}
        {selectedFile && (
          <DamageAnalyzer 
            imageFile={uploading ? selectedFile : null}
            onAnalysisComplete={handleAnalysisComplete}
            onAnalysisError={handleAnalysisError}
            onAnalysisStart={handleAnalysisStart}
          />
        )}

        {analysisResult && !uploading && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <h4 className="text-md font-semibold text-gray-800 mb-2">Analysis Complete:</h4>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700">Damage Type: <span className="font-bold text-gray-900">{analysisResult.damageType}</span></p>
              <p className="text-sm font-medium text-gray-700">Confidence: <span className="font-bold text-gray-900">{(analysisResult.confidence * 100).toFixed(2)}%</span></p>
              {analysisResult.repairEstimate && (
                <p className="text-sm font-medium text-gray-700">Estimated Repair Cost: <span className="font-bold text-gray-900">{analysisResult.repairEstimate}</span></p>
              )}
            </div>
            
            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-800 mb-1">Recommendations:</h5>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={() => {
                setPreview(null);
                setSelectedFile(null);
                setAnalysisResult(null);
                setError(null);
                if(preview) URL.revokeObjectURL(preview);
              }}
              className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Upload Another Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;

// Basic CSS for fadeIn animation (add to your global CSS or a relevant stylesheet)
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out forwards;
}
*/
