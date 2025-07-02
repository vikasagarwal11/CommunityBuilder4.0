import React from 'react';
import { Calendar, Clock, RefreshCw } from 'lucide-react';

interface RecurringEventOptionsProps {
  recurrencePattern: string;
  recurrenceInterval: string;
  recurrenceEndDate: string;
  onPatternChange: (pattern: string) => void;
  onIntervalChange: (interval: string) => void;
  onEndDateChange: (endDate: string) => void;
}

const RecurringEventOptions: React.FC<RecurringEventOptionsProps> = ({
  recurrencePattern,
  recurrenceInterval,
  recurrenceEndDate,
  onPatternChange,
  onIntervalChange,
  onEndDateChange
}) => {
  return (
    <div className="bg-neutral-50 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center">
          <RefreshCw className="h-4 w-4 mr-2 text-primary-500" />
          Recurring Event Settings
        </h3>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Recurrence Pattern
        </label>
        <select
          value={recurrencePattern}
          onChange={(e) => onPatternChange(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Repeat every
        </label>
        <div className="flex items-center">
          <input
            type="number"
            value={recurrenceInterval}
            onChange={(e) => onIntervalChange(e.target.value)}
            className="w-20 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mr-2"
            min="1"
          />
          <span className="text-neutral-700">
            {recurrencePattern === 'daily' ? 'days' : 
             recurrencePattern === 'weekly' ? 'weeks' : 'months'}
          </span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          End Recurrence (optional)
        </label>
        <div className="relative">
          <input
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 pl-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Calendar className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
        </div>
      </div>
      
      <div className="text-xs text-neutral-500 mt-2">
        <p>This event will repeat according to the pattern you've set.</p>
        <p>Members can RSVP to individual occurrences or the entire series.</p>
      </div>
    </div>
  );
};

export default RecurringEventOptions;