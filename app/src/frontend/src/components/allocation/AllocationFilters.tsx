import React from 'react';

interface FilterState {
  minGpa: number;
  maxGpa: number;
  availability: string[];
  maxRank: number;
  major: string;
}

interface AllocationFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const AllocationFilters: React.FC<AllocationFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const handleFilterChange = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      minGpa: 0,
      maxGpa: 4.0,
      availability: [],
      maxRank: 5,
      major: ''
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Filters</h2>
        <button
          onClick={resetFilters}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GPA Range */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            GPA Range
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="4.0"
              step="0.1"
              value={filters.minGpa}
              onChange={(e) => handleFilterChange('minGpa', parseFloat(e.target.value) || 0)}
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min"
            />
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="number"
              min="0"
              max="4.0"
              step="0.1"
              value={filters.maxGpa}
              onChange={(e) => handleFilterChange('maxGpa', parseFloat(e.target.value) || 4.0)}
              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Max"
            />
          </div>
        </div>

        {/* Major */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Major
          </label>
          <select
            value={filters.major}
            onChange={(e) => handleFilterChange('major', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Majors</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Statistics">Statistics</option>
            <option value="Physics">Physics</option>
            <option value="Economics">Economics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>

        {/* Max Rank */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Max Course Preference Rank
          </label>
          <select
            value={filters.maxRank}
            onChange={(e) => handleFilterChange('maxRank', parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={1}>1st Choice Only</option>
            <option value={2}>1st-2nd Choice</option>
            <option value={3}>1st-3rd Choice</option>
            <option value={4}>1st-4th Choice</option>
            <option value={5}>All Choices</option>
          </select>
        </div>

        {/* Status Filter (simplified from availability) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Actions
          </label>
          <div className="space-y-1">
            <button
              onClick={() => onFiltersChange({ ...filters, minGpa: 3.5 })}
              className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              High GPA Only (3.5+)
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.minGpa > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
            Min GPA: {filters.minGpa}
            <button
              onClick={() => handleFilterChange('minGpa', 0)}
              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              ×
            </button>
          </span>
        )}
        {filters.maxGpa < 4.0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
            Max GPA: {filters.maxGpa}
            <button
              onClick={() => handleFilterChange('maxGpa', 4.0)}
              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              ×
            </button>
          </span>
        )}
        {filters.major && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
            Major: {filters.major}
            <button
              onClick={() => handleFilterChange('major', '')}
              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              ×
            </button>
          </span>
        )}
        {filters.maxRank < 5 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
            Max Rank: {filters.maxRank}
            <button
              onClick={() => handleFilterChange('maxRank', 5)}
              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              ×
            </button>
          </span>
        )}
      </div>
    </div>
  );
}; 