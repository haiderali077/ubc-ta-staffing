import React, { useState, useEffect } from 'react';
import { systemSettingsApi } from '../../api/systemSettingsApi';
import type { SystemSetting } from '../../api/systemSettingsApi';

const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await systemSettingsApi.getSettings();
      setSettings(response.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error('Error fetching system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (settingId: string, newValue: string) => {
    try {
      setSaving(true);
      setError(null);
      
      // Find the setting to get its key
      const setting = settings.find(s => s.id === settingId);
      if (!setting) {
        throw new Error('Setting not found');
      }
      
      // Convert setting name to key format (e.g., "TA Application Deadline" -> "ta_application_deadline")
      const key = setting.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
      
      // Call API to update setting
      await systemSettingsApi.updateSetting(key, newValue);
      
      // Update local state with the updated setting
      setSettings(settings.map(s => 
        s.id === settingId 
          ? { ...s, value: newValue }
          : s
      ));
      
      setEditingSetting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      console.error('Error updating setting:', err);
    } finally {
      setSaving(false);
    }
  };

  const getInputType = (type: string) => {
    switch (type) {
      case 'date': return 'date';
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      default: return 'text';
    }
  };

  const renderInput = (setting: SystemSetting) => {
    if (setting.type === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={setting.value === 'true'}
          onChange={(e) => handleSave(setting.id, e.target.checked.toString())}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
          disabled={saving}
        />
      );
    }

    if (editingSetting?.id === setting.id) {
      return (
        <div className="flex space-x-2">
          <input
            type={getInputType(setting.type)}
            defaultValue={setting.value}
            data-setting-id={setting.id}
            className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave(setting.id, (e.target as HTMLInputElement).value);
              }
            }}
          />
          <button
            onClick={() => handleSave(setting.id, (document.querySelector(`input[data-setting-id="${setting.id}"]`) as HTMLInputElement)?.value || setting.value)}
            disabled={saving}
            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setEditingSetting(null)}
            disabled={saving}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-900 dark:text-white">{setting.value}</span>
        <button
          onClick={() => setEditingSetting(setting)}
          disabled={saving}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
      </div>
    );
  };

  const categories = [...new Set(settings.map(s => s.category))].filter(category => category !== 'System Configuration');

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure system-wide settings and application deadlines
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure system-wide settings and application deadlines
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                {category}
              </h3>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <dl>
                {settings
                  .filter(setting => setting.category === category)
                  .map((setting, index, filteredSettings) => (
                    <div key={setting.id} className={`px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${index !== filteredSettings.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {setting.name}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                        {renderInput(setting)}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {setting.description}
                        </p>
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemSettingsPage; 