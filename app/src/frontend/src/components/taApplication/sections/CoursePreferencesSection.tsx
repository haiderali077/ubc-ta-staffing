import React from "react";
import type { Course } from "../../../types/application";

interface CoursePreferencesSectionProps {
  courses: Course[];
  value: { course_id: number; rank: number }[];
  onChange: (val: { course_id: number; rank: number }[]) => void;
  error?: string;
}

const CoursePreferencesSection: React.FC<CoursePreferencesSectionProps> = ({
  courses,
  value,
  onChange,
  error,
}) => {
  // Early return if no courses are available
  if (courses.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Courses Available</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              There are currently no courses with open TA positions. Please check back later or contact the TA coordinator for more information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Flexible course selection (0-3 courses) - dynamically determine max slots based on available courses
  const maxSlots = Math.min(courses.length, 3);
  
  const handleSelect = (index: number, courseId: number) => {
    const updated = [...value];
    if (courseId === 0) {
      // Clear selection and compact array
      updated.splice(index, 1);
    } else {
      updated[index] = { course_id: courseId, rank: index + 1 };
    }
    
    // Remove duplicates and rerank
    const seen = new Set();
    const cleaned = updated
      .filter((item) => {
        if (item && item.course_id && item.course_id !== 0 && !seen.has(item.course_id)) {
          seen.add(item.course_id);
          return true;
        }
        return false;
      })
      .map((item, i) => ({ ...item, rank: i + 1 }));
    
    onChange(cleaned);
  };

  const handleAddSlot = () => {
    if (value.length < maxSlots) {
      const updated = [...value, { course_id: 0, rank: value.length + 1 }];
      onChange(updated);
    }
  };

  const handleRemoveSlot = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    onChange(updated);
  };

  // Prevent selecting the same course in multiple ranks
  const selectedIds = value.map((v) => v?.course_id).filter(Boolean);

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Rank your course preferences in order (up to {maxSlots} course{maxSlots !== 1 ? 's' : ''}). 
          Course preferences are optional - you can submit without selecting any courses.
        </p>
      </div>
      
      <div className="space-y-4">
        {value.map((preference, i) => (
          <div key={i} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {i === 0 ? "1st Preference" : i === 1 ? "2nd Preference" : "3rd Preference"}
            </label>
            <div className="relative flex items-center space-x-2">
              <div className="relative flex-1">
                <select
                  className={`w-full px-3 py-2 pr-12 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 ${
                    preference?.course_id ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'none'
                  }}
                  value={preference?.course_id || ""}
                  onChange={(e) => handleSelect(i, Number(e.target.value))}
                >
                  <option value="">
                    Select your {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"} choice course
                  </option>
                  <option value="0">Clear selection</option>
                  {courses.map((course) => (
                    <option
                      key={course.course_id}
                      value={course.course_id}
                      disabled={
                        selectedIds.includes(course.course_id) &&
                        preference?.course_id !== course.course_id
                      }
                    >
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
                
                {/* Dropdown arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {/* Checkmark when course is selected */}
                {preference?.course_id && preference.course_id !== 0 && (
                  <div className="absolute inset-y-0 right-8 flex items-center pr-3 pointer-events-none">
                    <span className="text-green-500 dark:text-green-400">✓</span>
                  </div>
                )}
              </div>
              
              {/* Delete button */}
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(i)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                  title="Remove this preference"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        
        {value.length < maxSlots && (
          <button
            type="button"
            onClick={handleAddSlot}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Course Preference
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3">
          <div className="text-sm text-red-600 dark:text-red-400 flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}
      
      {/* Progress indicator */}
      {maxSlots > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Course Preferences:</span>
            <span className={`font-medium ${
              selectedIds.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'
            }`}>
              {selectedIds.length}/{maxSlots} course{maxSlots !== 1 ? 's' : ''} selected
            </span>
          </div>
          {maxSlots > 1 && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${selectedIds.length > 0 ? (selectedIds.length / maxSlots) * 100 : 0}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoursePreferencesSection;
