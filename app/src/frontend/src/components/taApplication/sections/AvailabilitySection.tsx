import React from "react";

interface AvailabilitySectionProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  value,
  onChange,
  error,
}) => {
  const characterCount = value.length;
  const minCharacters = 10;
  const isValid = characterCount >= minCharacters;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Term Availability *
      </label>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-2">
          Please provide detailed information about your availability during the term. Include:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 ml-4">
          <li>• Days and hours you're available</li>
          <li>• Any scheduling constraints or preferences</li>
          <li>• Flexibility during exam periods or special events</li>
          <li>• Other commitments that might affect your schedule</li>
        </ul>
      </div>

      <div className="relative">
      <textarea
          className={`w-full px-3 py-3 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-vertical ${
            error 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : isValid && characterCount > 0
                ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                : 'border-gray-300'
          }`}
          placeholder="Example: Available Monday-Friday 9AM-6PM, weekends 10AM-4PM. Can work evenings during exam periods. Not available Tuesdays 2-4PM due to another course."
        value={value}
        onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ minHeight: '100px' }}
        />
        
        {/* Character count indicator */}
        <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
          <span className={`text-xs ${
            characterCount >= minCharacters ? 'text-green-600' : 'text-gray-500'
          }`}>
            {characterCount} chars {characterCount >= minCharacters && '✓'}
          </span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center text-sm ${
            characterCount >= minCharacters ? 'text-green-600' : 'text-gray-400'
          }`}>
            <span className="mr-1">
              {characterCount >= minCharacters ? '✓' : '⭕'}
            </span>
            Minimum {minCharacters} characters
          </div>
          
          {characterCount > 0 && (
            <div className="text-sm text-gray-500">
              Length: {characterCount < 50 ? 'Brief' : characterCount < 150 ? 'Good' : 'Detailed'}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-600 flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {isValid && !error && characterCount > 0 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
          <div className="text-sm text-green-600 flex items-center">
            <span className="mr-2">✓</span>
            Great! Your availability information looks detailed and helpful.
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilitySection;
