import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface Assignment {
  allocation_id: number;
  lab_section_id: number;
  section_name: string;
  lab_days: string;
  lab_start_time: string;
  lab_end_time: string;
  course_code: string;
  course_title: string;
  term: string;
  allocated_at: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  allocated_by_name?: string;
  is_marker?: boolean;
}

interface AssignmentCalendarProps {
  assignments: Assignment[];
  loading?: boolean;
}

interface LabSession {
  assignment: Assignment;
  startTime: string;
  endTime: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  labSessions: LabSession[];
}

const AssignmentCalendar: React.FC<AssignmentCalendarProps> = ({ 
  assignments, 
  loading = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Generate calendar days for the current month
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End at the Saturday of the week containing the last day
    const calendarEnd = new Date(lastDay);
    calendarEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDay = new Date(calendarStart);
    
    // Helper function to get day of week from day name
    const getDayOfWeek = (dayName: string): number => {
      const dayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      return dayMap[dayName] ?? -1;
    };
    
    while (currentDay <= calendarEnd) {
      const dayOfWeek = currentDay.getDay();
      const labSessions: LabSession[] = [];
      
      // Check each assignment to see if it has lab sessions on this day
      assignments.forEach(assignment => {
        if (assignment.status === 'active' && assignment.lab_days) {
          // Parse lab_days (e.g., "Monday, Wednesday" or "Tuesday")
          const labDays = assignment.lab_days.split(',').map(day => day.trim());
          
          // Check if any of the lab days match the current day
          const hasLabToday = labDays.some(labDay => {
            const labDayOfWeek = getDayOfWeek(labDay);
            return labDayOfWeek === dayOfWeek;
          });
          
          if (hasLabToday) {
            labSessions.push({
              assignment: assignment,
              startTime: assignment.lab_start_time,
              endTime: assignment.lab_end_time
            });
          }
        }
      });
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        labSessions: labSessions
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    setSelectedDay(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'completed':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }, (_, i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-24 p-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer transition-colors
                ${day.isCurrentMonth ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
                ${selectedDay === day ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900' : ''}
              `}
              onClick={() => setSelectedDay(day)}
            >
              <div className={`text-sm font-medium ${
                day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {day.date.getDate()}
              </div>
              
              {day.labSessions.length > 0 && (
                <div className="mt-1 space-y-1">
                  {day.labSessions.slice(0, 2).map((session, i) => (
                    <div
                      key={i}
                      className={`text-xs px-2 py-1 rounded-md border ${getStatusColor(session.assignment.status)}`}
                    >
                      <div className="font-medium">{session.assignment.course_code}</div>
                      <div className="text-gray-600 dark:text-gray-300">{session.startTime}-{session.endTime}</div>
                    </div>
                  ))}
                  {day.labSessions.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                      +{day.labSessions.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lab Sessions Details Modal/Panel */}
      {selectedDay && selectedDay.labSessions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Lab Sessions for {formatDate(selectedDay.date)}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {selectedDay.labSessions.map((session) => (
              <div
                key={session.assignment.allocation_id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {session.assignment.course_code} - {session.assignment.course_title}
                      {session.assignment.is_marker && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full flex items-center gap-1">
                          ⭐ Course Marker
                        </span>
                      )}
                    </h4>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {session.assignment.section_name}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>Term: {session.assignment.term}</span>
                      </div>
                      {session.assignment.allocated_by_name && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          <span>Assigned by: {session.assignment.allocated_by_name}</span>
                        </div>
                      )}
                      {session.assignment.notes && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Notes:</span> {session.assignment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.assignment.status)}`}>
                    {session.assignment.status.charAt(0).toUpperCase() + session.assignment.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No assignments message */}
      {assignments.length === 0 && (
        <div className="p-6 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assignments</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You don't have any TA assignments yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default AssignmentCalendar; 