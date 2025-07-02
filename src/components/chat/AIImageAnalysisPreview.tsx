import React from 'react';
import { Image, Check, X, Loader, Info } from 'lucide-react';

interface AIImageAnalysisPreviewProps {
  images: {
    url: string;
    analysis?: {
      description: string;
      tags: string[];
      safetyCheck: {
        isSafe: boolean;
        issues?: string[];
      };
    };
    isAnalyzing: boolean;
  }[];
  onRemoveImage: (index: number) => void;
}

const AIImageAnalysisPreview: React.FC<AIImageAnalysisPreviewProps> = ({
  images,
  onRemoveImage
}) => {
  if (images.length === 0) return null;

  return (
    <div className="bg-neutral-50 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium flex items-center">
          <Image className="h-4 w-4 mr-1 text-primary-500" />
          Image Analysis
        </h4>
        <p className="text-xs text-neutral-500">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="space-y-3">
        {images.map((image, index) => (
          <div key={index} className="flex bg-white rounded-lg overflow-hidden border border-neutral-200">
            <div className="w-20 h-20 flex-shrink-0">
              <img 
                src={image.url} 
                alt={`Attachment ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-grow p-2 text-xs">
              {image.isAnalyzing ? (
                <div className="flex items-center h-full">
                  <Loader className="h-4 w-4 text-primary-500 animate-spin mr-2" />
                  <span className="text-neutral-600">Analyzing image...</span>
                </div>
              ) : image.analysis ? (
                <div>
                  <p className="font-medium mb-1">{image.analysis.description}</p>
                  <div className="flex items-center">
                    {image.analysis.safetyCheck.isSafe ? (
                      <span className="flex items-center text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Safe content
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <Info className="h-3 w-3 mr-1" />
                        Content flagged
                      </span>
                    )}
                  </div>
                  {image.analysis.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {image.analysis.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700">
                          {tag}
                        </span>
                      ))}
                      {image.analysis.tags.length > 3 && (
                        <span className="text-neutral-500">+{image.analysis.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center h-full text-neutral-600">
                  Image ready to send
                </div>
              )}
            </div>
            <button
              onClick={() => onRemoveImage(index)}
              className="p-2 text-neutral-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIImageAnalysisPreview;