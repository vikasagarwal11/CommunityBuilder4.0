import React, { useState } from 'react';
import { Eye, EyeOff, Tag, Check, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageAnalysisResultProps {
  image: {
    url: string;
    analysis?: {
      description: string;
      tags: string[];
      safetyCheck: {
        isSafe: boolean;
        issues?: string[];
      };
      objects?: string[];
      text?: string;
      landmarks?: string[];
      colors?: Array<{name: string, hex: string}>;
    };
    isAnalyzing: boolean;
  };
  onRemove: () => void;
}

const ImageAnalysisResult: React.FC<ImageAnalysisResultProps> = ({
  image,
  onRemove
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!image.analysis && !image.isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="aspect-video relative">
          
          <img src={image.url} alt="Uploaded image" className="w-full h-auto object-contain rounded-lg max-h-60" />
        </div>
        <div className="p-3">
          <p className="text-sm text-neutral-600">Image ready to send</p>
          <button
            onClick={onRemove}
            className="mt-2 text-xs text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="aspect-video relative">
        <img 
          src={image.url} 
          alt="Uploaded image" 
          className="w-full h-full object-cover"
        />
        {image.isAnalyzing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm">Analyzing image...</p>
            </div>
          </div>
        )}
      </div>
      
      {image.analysis && (
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-sm">{image.analysis.description}</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-primary-500 hover:text-primary-600"
              title={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex items-center mb-2">
            {image.analysis.safetyCheck.isSafe ? (
              <span className="flex items-center text-green-600 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Safe content
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Content flagged
              </span>
            )}
          </div>
          
          {image.analysis.tags && image.analysis.tags.length > 0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {image.analysis.tags.slice(0, showDetails ? undefined : 5).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-neutral-100 rounded text-xs text-neutral-700 flex items-center">
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </span>
                ))}
                {!showDetails && image.analysis.tags.length > 5 && (
                  <span className="text-xs text-neutral-500">+{image.analysis.tags.length - 5} more</span>
                )}
              </div>
            </div>
          )}
          
          <motion.div
            initial={false}
            animate={{ height: showDetails ? 'auto' : 0, opacity: showDetails ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {image.analysis.text && (
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-700">Detected text:</p>
                <p className="text-xs text-neutral-600 mt-1 bg-neutral-50 p-1 rounded">
                  {image.analysis.text}
                </p>
              </div>
            )}
            
            {image.analysis.objects && image.analysis.objects.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-700">Detected objects:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.analysis.objects.map((object, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 rounded text-xs text-blue-700">
                      {object}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {image.analysis.landmarks && image.analysis.landmarks.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-700">Landmarks:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.analysis.landmarks.map((landmark, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-purple-50 rounded text-xs text-purple-700">
                      {landmark}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {image.analysis.colors && image.analysis.colors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-neutral-700">Dominant colors:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.analysis.colors.map((color, i) => (
                    <div key={i} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-1" 
                        style={{ backgroundColor: color.hex }}
                      ></div>
                      <span className="text-xs text-neutral-600">{color.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {image.analysis.safetyCheck.issues && image.analysis.safetyCheck.issues.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-red-700">Safety issues:</p>
                <div className="mt-1 space-y-1">
                  {image.analysis.safetyCheck.issues.map((issue, i) => (
                    <div key={i} className="flex items-start">
                      <AlertTriangle className="h-3 w-3 text-red-500 mr-1 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
          
          <button
            onClick={onRemove}
            className="mt-2 text-xs text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageAnalysisResult;