import React from "react";

interface NotesSectionProps {
  value: string;
  onChange: (val: string) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({ value, onChange }) => {
  const characterCount = value.length;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
        Additional Notes (optional)
      </label>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 dark:text-white">
          Share any additional information that might strengthen your application, such as:
        </p>
        <ul className="text-sm text-gray-600 dark:text-white space-y-1 ml-4 mt-1">
          <li>• Relevant work or research experience</li>
          <li>• Special skills or certifications</li>
          <li>• Passion for teaching or helping students</li>
          <li>• Any unique qualifications or perspectives</li>
        </ul>
      </div>

      <div className="relative">
      <textarea
          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          placeholder="Example: I have 2 years of tutoring experience in calculus and statistics. I'm passionate about helping students understand complex concepts through practical examples..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ minHeight: '80px' }}
        />
        
        {characterCount > 0 && (
          <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-600 px-2 py-1 rounded border border-gray-200 dark:border-gray-500 shadow-sm">
            <span className="text-xs text-gray-500 dark:text-gray-200">
              {characterCount} chars
            </span>
          </div>
        )}
      </div>

      {characterCount > 0 && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          Length: {characterCount < 50 ? 'Brief' : characterCount < 150 ? 'Good' : 'Detailed'}
        </div>
      )}
    </div>
  );
};

export default NotesSection;
