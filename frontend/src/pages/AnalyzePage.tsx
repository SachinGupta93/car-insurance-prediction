import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import MultiRegionAnalysisResults from '../components/analysis/MultiRegionAnalysisResults';
import { DamageResult } from '../types';

const AnalyzePage: React.FC = () => {
  const location = useLocation();
  const [analysisResult, setAnalysisResult] = useState<DamageResult | null>(
    location.state?.analysisResult || null
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    location.state?.imageUrl || null
  );

  const handleAnalysisComplete = (imageUrl: string, result: DamageResult) => {
    setAnalysisResult(result);
    setImageUrl(imageUrl);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Car Damage Analysis
      </h1>
      {!analysisResult ? (
        <ImageUpload onImageUploaded={handleAnalysisComplete} />
      ) : (
        imageUrl && (
          <MultiRegionAnalysisResults
            result={analysisResult}
            imageUrl={imageUrl}
          />
        )
      )}
    </div>
  );
};

export default AnalyzePage;
