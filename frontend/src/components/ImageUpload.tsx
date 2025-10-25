import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useNotificationHelpers } from '@/context/NotificationContext';
import { DamageResult, UploadedImage } from '@/types';
import DamageAnalyzer from './damage/DamageAnalyzer';
import unifiedApiService from '@/services/unifiedApiService';
import damageRegionService from '@/services/damageRegionService';
import MultiRegionAnalysisResults from './analysis/MultiRegionAnalysisResults';
import { useFirebaseService } from '@/services/firebaseService';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string, analysisResult: DamageResult) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded }) => {
  const { firebaseUser, loading: loadingAuth } = useFirebaseAuth();
  const { success, error: notifyError } = useNotificationHelpers();
  const firebaseService = useFirebaseService();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DamageResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);  
  const previewUrlRef = useRef<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Effect to manage URL objects and prevent memory leaks
  useEffect(() => {
    // Clean up previous preview URL if it's different from the current one
    if (previewUrlRef.current && previewUrlRef.current !== preview) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    
    // Store current preview URL
    previewUrlRef.current = preview;
    
    // If there's a new preview URL and it starts with blob:, add it to our tracking array
    if (preview && preview.startsWith('blob:')) {
      blobUrlsRef.current.push(preview);
    }

    // Cleanup function to revoke all blob URLs on component unmount
    return () => {
      // Revoke current preview if it exists
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      
      // Revoke all tracked blob URLs
      blobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Error revoking URL object:', err);
        }
      });
      blobUrlsRef.current = [];
    };
  }, [preview]);

  const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Allow preview even if not logged in; actual analysis will still be gated
    if (!firebaseUser && !loadingAuth) {
      setError('You are not logged in. Preview enabled, analysis requires login.');
      notifyError('Authentication Required', 'Please log in to analyze and save results.');
      // do not return here so user can still preview the image
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, JPEG, PNG, WEBP, or HEIC/HEIF image.');
      notifyError('Invalid File Type', 'Please upload a JPG, JPEG, PNG, WEBP, or HEIC/HEIF image.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 10MB.');
      notifyError('File Too Large', 'Please upload an image smaller than 10MB.');
      return;
    }

    // Revoke old preview URL if one exists
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const newPreviewUrl = URL.createObjectURL(file);
    setPreview(newPreviewUrl);
    setSelectedFile(file);
    setError(null);
    setAnalysisResult(null);
    setUploading(false);
    setProgress(0);

    success('Image Uploaded', 'Image ready for analysis. Click "Analyze Image" to start.');
  }, [firebaseUser, loadingAuth, success, notifyError, preview]);  

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    onDropRejected: (fileRejections) => {
      const first = fileRejections?.[0];
      const code = first?.errors?.[0]?.code;
      const message = first?.errors?.[0]?.message;
      const msg = code === 'file-invalid-type'
        ? 'Unsupported file type. Please upload JPG, JPEG, PNG, or WEBP.'
        : code === 'file-too-large'
          ? 'File too large. Maximum size is 10MB.'
          : message || 'File was rejected.';
      setError(msg);
      notifyError('Upload Error', msg);
    },
    accept: { 
      'image/*': [],
      'image/heic': ['.heic'],
      'image/heif': ['.heif']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
    noClick: false,
    noKeyboard: false,
    multiple: false
  });

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setError('Analysis cancelled.');
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setAnalysisResult(null); // Also clear analysisResult on cancel
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
    // No need to cancel upload here, as this button is shown when !uploading
  };

  // This function is called by DamageAnalyzer when it *actually* begins its process.
  const handleAnalysisStart = () => {
    // The abortController should have been created by the action that initiated the analysis (e.g., button click)
    setUploading(true); // Confirm uploading state
    setProgress(0);     // Reset progress
    setError(null);     // Clear previous errors
  };
  const handleAnalysisComplete = async (result: DamageResult) => {
    console.log('🔍 ImageUpload: Starting enhanced analysis with damage regions...');
    
    // Convert file to Base64 for region analysis and storage
    let imageBase64 = '';

    if (selectedFile) {
      try {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      } catch (error) {
        console.error("Error converting image to Base64:", error);
        notifyError('Image Processing Error', 'Could not process the uploaded image for history.');
      }
    }

    // Enhance the result with damage region analysis only if regions are missing
    let enhancedResult = result;
    const hasTopRegions = Array.isArray(result?.identifiedDamageRegions) && (result?.identifiedDamageRegions?.length || 0) > 0;
    const hasMoRegions = Array.isArray((result as any)?.mandatoryOutput?.identifiedDamageRegions) && (((result as any)?.mandatoryOutput?.identifiedDamageRegions?.length) || 0) > 0;
    if (!hasTopRegions && !hasMoRegions && imageBase64) {
      try {
        enhancedResult = await damageRegionService.enhanceDamageResult(result, imageBase64);
        console.log('🔍 ImageUpload: Enhanced result with regions:', enhancedResult.identifiedDamageRegions?.length || 0);
      } catch (error) {
        console.error('Failed to enhance with region analysis:', error);
      }
    } else {
      console.log('ℹ️ ImageUpload: Skipping region enhancement (regions already present from AI)');
    }

    setAnalysisResult(enhancedResult);
    setUploading(false);
    setProgress(100);

    if (enhancedResult.isDemoMode) {
      success('Demo Analysis Complete', 'API Quota exceeded. Showing a sample analysis with detected regions.');
    } else {
      const regionCount = enhancedResult.identifiedDamageRegions?.length || 0;
      success('Analysis Complete', `Successfully analyzed damage with ${(enhancedResult.confidence * 100).toFixed(1)}% confidence. Found ${regionCount} damage regions.`);
    }

    // Call parent callback if provided
    if (onImageUploaded && imageBase64 && imageBase64.startsWith('data:')) {
      onImageUploaded(imageBase64, result);
    }

    // Save analysis to history with proper image data
    try {
      // Upload original image and a small thumbnail to Firebase Storage
      let imagePath = '';
      let imageUrl = '';
      let thumbnailPath = '';
      let thumbnailUrl = '';
      if (selectedFile) {
        try {
          const media = await firebaseService.uploadAnalysisMedia(selectedFile);
          imagePath = media.imagePath;
          imageUrl = media.imageUrl;
          thumbnailPath = media.thumbnailPath;
          thumbnailUrl = media.thumbnailUrl;
        } catch (err) {
          console.error('Failed to upload media to Firebase Storage:', err);
        }
      }
      const nowIso = new Date().toISOString();
      const historyItem = {
        // Avoid storing base64 in DB; rely on Storage references
        image: '',
        imageUrl: thumbnailUrl || imageUrl || '',
        imagePath,
        thumbnailUrl,
        thumbnailPath,
        result: enhancedResult,
        filename: selectedFile?.name || (enhancedResult.isDemoMode ? 'demo_analysis.jpg' : 'analysis.jpg'),
        timestamp: nowIso,
        analysisDate: nowIso,
        confidence: enhancedResult.confidence,
        severity: enhancedResult.severity || 'unknown',
        isDemo: enhancedResult.isDemoMode || false,
      };
      
      console.log(`💾 Saving ${historyItem.isDemo ? 'DEMO' : 'REAL'} analysis to history...`);
      
      await unifiedApiService.addAnalysisToHistory(historyItem);

      // Add to cache for immediate UI update
      const uploadedImage: UploadedImage = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        userId: firebaseUser?.uid || '',
        uploadedAt: new Date().toISOString(),
        analysisDate: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        filename: selectedFile?.name || (result.isDemoMode ? 'demo_analysis.jpg' : 'analysis.jpg'),
        image: imageBase64 || preview || '',
        result: result,
        confidence: result.confidence,
        severity: result.severity || 'minor',
        // Add missing fields that might be needed for analysis
        damageType: result.damageType || 'Unknown',
        repairEstimate: result.repairEstimate || `₹${Math.floor(Math.random() * 50000) + 10000}`,
        description: result.description || 'Damage analysis completed',
        recommendations: result.recommendations || ['Check with insurance provider', 'Get repair estimate']
      };
      
      console.log('✅ Analysis completed successfully');
      success('Analysis Complete', 'Your damage analysis has been completed successfully.');

    } catch (error) {
      console.error('❌ Failed to save analysis to history:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      notifyError('History Save Failed', `Could not save analysis to history: ${errorMessage}`);
    }
  };

  const handleAnalysisError = (errorMessage: string) => {
    setError(errorMessage);
    setUploading(false);
    setProgress(0);
    notifyError('Analysis Failed', errorMessage);
  };

  // Fix 3b: Logic for starting analysis, now explicitly triggered by the button
  const handleInitiateAnalysis = () => {
    if (!selectedFile) {
      setError('No image selected for analysis');
      return;
    }

    if (!firebaseUser) {
      setError('You must be logged in to analyze images');
      return;
    }

    abortControllerRef.current = new AbortController();
    setUploading(true);
    setProgress(0);
    setError(null);
  };

  const handleBackFromAnalyzer = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setAnalysisResult(null);
    setError(null);
    setUploading(false); // Ensure uploading state is reset
    setProgress(0);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-rose-50 opacity-30"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-rose-200">
            {/* 
              Main conditional rendering:
              - If 'uploading' is true (analysis in progress) OR 
              - if 'analysisResult' is present (analysis complete) AND 
              - 'selectedFile' is not null:
                Show DamageAnalyzer.
              - Otherwise:
                Show the image upload interface.
            */}
            { (uploading || analysisResult) && selectedFile ? (
              <DamageAnalyzer
                imageFile={selectedFile}
                onAnalysisStart={handleAnalysisStart} // Callback when DA starts its async task
                onAnalysisComplete={handleAnalysisComplete} // Callback for successful analysis
                onAnalysisError={handleAnalysisError} // Callback for analysis error
                onBack={handleBackFromAnalyzer} // Callback to go back to upload UI
                isAnalyzing={uploading} // Pass the 'uploading' state to DA
                abortSignal={abortControllerRef.current?.signal} // For aborting analysis
              />
            ) : (
              // Upload Interface
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-200 mb-4">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-black mb-2">
                    AI Car Damage Analyzer
                  </h1>
                  
                  <p className="text-lg text-gray-600">
                    Upload an image of your car to get an instant damage analysis and repair estimate.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`mt-6 p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-200 ease-in-out 
                    ${isDragActive ? 'border-rose-500 bg-rose-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isDragReject ? 'border-red-500 bg-red-50' : ''}
                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  {preview && selectedFile ? (
                    <div className="relative group">
                      <img src={preview} alt="Preview" className="max-h-60 w-auto mx-auto rounded-lg shadow-md" />
                      <button
                        onClick={handleRemovePreview}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                        aria-label="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    isDragActive ?
                      <p className="text-rose-600">Drop the image here ...</p> :
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-gray-500">Drag & drop an image here, or</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); open(); }}
                          className="inline-flex items-center px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                          Browse files
                        </button>
                        <p className="text-xs text-gray-400">JPG, JPEG, PNG, WEBP, or HEIC/HEIF up to 10MB</p>
                      </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
                
                {/* "Analyze Image" button - shown only when an image is selected and ready for analysis */}
                {preview && selectedFile && !uploading && !analysisResult && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleInitiateAnalysis}
                      disabled={loadingAuth || !firebaseUser}
                      className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze Image
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;