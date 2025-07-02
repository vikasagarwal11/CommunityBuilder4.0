import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, X, Shield, Info } from 'lucide-react';

interface AIContentModerationDialogProps {
  content: string;
  moderationResult: {
    isSafe: boolean;
    issues: string[];
    score: number;
  };
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

const AIContentModerationDialog: React.FC<AIContentModerationDialogProps> = ({
  content,
  moderationResult,
  onApprove,
  onReject,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white rounded-xl max-w-md w-full p-6"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold">Content Moderation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`p-4 rounded-lg mb-4 ${
          moderationResult.isSafe 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center mb-2">
            {moderationResult.isSafe ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <h4 className={`font-medium ${
              moderationResult.isSafe ? 'text-green-700' : 'text-red-700'
            }`}>
              {moderationResult.isSafe 
                ? 'Content appears to be safe' 
                : 'Potential content issues detected'}
            </h4>
          </div>

          {/* Safety score */}
          <div className="mb-3">
            <p className="text-sm text-neutral-600 mb-1">Safety score:</p>
            <div className="w-full bg-neutral-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  moderationResult.score > 0.7 ? 'bg-green-500' :
                  moderationResult.score > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${moderationResult.score * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-right mt-1 text-neutral-500">
              {Math.round(moderationResult.score * 100)}%
            </p>
          </div>

          {/* Issues */}
          {moderationResult.issues.length > 0 && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-1">Issues detected:</p>
              <ul className="text-sm space-y-1">
                {moderationResult.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Content preview */}
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-700 mb-1">Content preview:</p>
          <div className="p-3 bg-neutral-50 rounded-lg text-sm text-neutral-700 max-h-32 overflow-y-auto">
            {content}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onReject}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className={`px-4 py-2 ${
              moderationResult.isSafe
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
            } rounded-lg`}
          >
            {moderationResult.isSafe ? 'Approve' : 'Approve Anyway'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AIContentModerationDialog;