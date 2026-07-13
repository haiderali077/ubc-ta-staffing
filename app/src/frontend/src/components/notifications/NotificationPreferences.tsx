import React, { useEffect, useState } from "react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "../../api/notificationApi";

const NotificationPreferencesComponent: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    getNotificationPreferences()
      .then((data) => setPrefs(data))
      .catch(() => setError("Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (
    key: keyof NotificationPreferences,
    value: boolean | number
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateNotificationPreferences(prefs);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6 mb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM20 4H4v2h16V4zM4 10h16v2H4v-2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Settings
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-200 text-sm">
          ✓ Preferences updated successfully!
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={!!prefs.email_notifications}
              onChange={(e) =>
                handleChange("email_notifications", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 checked:bg-blue-600 dark:checked:bg-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Email Notifications
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={!!prefs.in_app_notifications}
              onChange={(e) =>
                handleChange("in_app_notifications", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 checked:bg-blue-600 dark:checked:bg-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                In-App Notifications
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Show notifications in the app
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={!!prefs.deadline_reminders}
              onChange={(e) =>
                handleChange("deadline_reminders", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 checked:bg-blue-600 dark:checked:bg-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Deadline Reminders
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Get reminded about upcoming deadlines
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={!!prefs.application_updates}
              onChange={(e) =>
                handleChange("application_updates", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 checked:bg-blue-600 dark:checked:bg-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Application Updates
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Updates about your TA applications
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={!!prefs.allocation_updates}
              onChange={(e) =>
                handleChange("allocation_updates", e.target.checked)
              }
              className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 checked:bg-blue-600 dark:checked:bg-blue-600"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Allocation Updates
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Updates about TA assignments
              </div>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-600">
          <label className="flex items-center gap-3">
            <span className="font-medium text-gray-900 dark:text-white">
              Reminder Days Before:
            </span>
            <input
              type="number"
              min={0}
              max={30}
              value={prefs.reminder_days_before ?? 7}
              onChange={(e) =>
                handleChange("reminder_days_before", Number(e.target.value))
              }
              className="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
          </label>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-600">
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferencesComponent;
