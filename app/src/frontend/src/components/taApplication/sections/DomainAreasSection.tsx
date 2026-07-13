import React, { useState } from "react";

interface DomainAreasSectionProps {
  value: string[];
  onChange: (val: string[]) => void;
  error?: string;
}

const DomainAreasSection: React.FC<DomainAreasSectionProps> = ({
  value,
  onChange,
  error,
}) => {
  const [newDomain, setNewDomain] = useState("");

  const handleAddDomain = () => {
    const trimmed = newDomain.trim();
    if (trimmed && !value.includes(trimmed) && value.length < 5) {
      onChange([...value, trimmed]);
      setNewDomain("");
    }
  };

  const handleRemoveDomain = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add your areas of expertise and interest (up to 5). This helps schedulers understand your background and match you with relevant courses.
        </p>
      </div>

      {/* Current Domain Areas */}
      {value.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Domain Areas:</h4>
          <div className="flex flex-wrap gap-2">
            {value.map((domain, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
              >
                {domain}
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(index)}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none"
                  title="Remove this domain"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add New Domain Area */}
      {value.length < 5 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add a domain area:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Statistics, Laboratory Safety, Mathematical Modeling, Programming..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              maxLength={50}
            />
            <button
              type="button"
              onClick={handleAddDomain}
              disabled={!newDomain.trim() || value.includes(newDomain.trim())}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-600 flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Domain Areas:</span>
          <span className={`font-medium ${
            value.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'
          }`}>
            {value.length}/5 domain areas added
          </span>
        </div>
        {value.length === 0 && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            💡 Add at least one domain area to help with course matching
          </div>
        )}
        {value.length >= 3 && (
          <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
            <span className="mr-1">✓</span>
            Great! You've provided good coverage of your expertise areas.
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainAreasSection;
