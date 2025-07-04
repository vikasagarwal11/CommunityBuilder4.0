import React, { useState } from 'react';
import { Calendar, Wand2, Edit3, X } from 'lucide-react';
import EventForm from './EventForm';

interface ManualEventCreationProps {
  communityId: string;
  onEventCreated: (eventId: string) => void;
  onClose: () => void;
}

type CreationMode = 'manual' | 'ai';

const ManualEventCreation: React.FC<ManualEventCreationProps> = ({
  communityId,
  onEventCreated,
  onClose
}) => {
  const [selectedMode, setSelectedMode] = useState<CreationMode | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleModeSelect = (mode: CreationMode) => {
    setSelectedMode(mode);
    setShowForm(true);
  };

  const handleBack = () => {
    setSelectedMode(null);
    setShowForm(false);
  };

  const handleEventCreated = (eventId: string) => {
    onEventCreated(eventId);
    onClose();
  };

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                  {selectedMode === 'ai' ? (
                    <Wand2 className="h-6 w-6 text-white" />
                  ) : (
                    <Edit3 className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedMode === 'ai' ? 'AI-Assisted Event Creation' : 'Manual Event Creation'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedMode === 'ai' 
                      ? 'Describe your event and let AI extract the details'
                      : 'Fill in all event details manually'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <EventForm
              communityId={communityId}
              onSuccess={handleEventCreated}
              onCancel={handleBack}
              showAIOption={selectedMode === 'ai'}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create New Event</h2>
                <p className="text-sm text-gray-500">Choose how you want to create your event</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Manual Creation Option */}
            <div 
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleModeSelect('manual')}
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Edit3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manual Creation</h3>
                  <p className="text-sm text-gray-500">Fill in all details yourself</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Complete control over all fields</li>
                <li>• No AI processing required</li>
                <li>• Direct form entry</li>
                <li>• Immediate creation</li>
              </ul>
            </div>

            {/* AI-Assisted Creation Option */}
            <div 
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleModeSelect('ai')}
            >
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <Wand2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI-Assisted</h3>
                  <p className="text-sm text-gray-500">Let AI extract details from description</p>
                </div>
              </div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Describe event in natural language</li>
                <li>• AI extracts date, time, location</li>
                <li>• Auto-populates form fields</li>
                <li>• Review and edit before creating</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Manual:</strong> Fill in each field directly in the form</p>
              <p><strong>AI-Assisted:</strong> Write a description like "Yoga session tomorrow at 6pm for 15 people" and AI will extract the details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualEventCreation; 