import React from "react";

interface QuickActionsProps {
  onApply?: () => void;
  onEditAvailability?: () => void;
  onEditProfile?: () => void;
  onViewApplicationStatus?: () => void;
  onViewAssignmentCalendar?: () => void;
  onLogout?: () => void;
  onNotifications?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onApply = () => {},
  onEditAvailability = () => {},
  onEditProfile = () => {},
  onViewApplicationStatus = () => {},
  onViewAssignmentCalendar = () => {},
  onLogout = () => {},
  onNotifications = () => {},
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
    <div className="space-y-3">
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        onClick={onApply}
      >
        Apply for TA Position
      </button>
      <button
        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
        onClick={onEditAvailability}
      >
        Edit Availability Calendar
      </button>
      <button
        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
        onClick={onEditProfile}
      >
        Edit Profile (Skills & Experience)
      </button>
      <button
        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
        onClick={onViewApplicationStatus}
      >
        View Application Status
      </button>
      <button
        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
        onClick={onViewAssignmentCalendar}
      >
        View Assignment Calendar
      </button>
      <button
        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
        onClick={onNotifications}
      >
        Notifications
      </button>
      <button
        className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg border border-red-200 transition-colors"
        onClick={onLogout}
      >
        Logout / Account Settings
      </button>
    </div>
  </div>
);

export default QuickActions;
