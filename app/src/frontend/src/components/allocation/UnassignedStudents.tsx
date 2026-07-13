import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';

interface ApprovedApplication {
  application_id: number;
  user_id: number;
  name: string;
  email: string;
  major: string;
  student_number?: string;
  gpa?: number;
  weekly_availability?: string;
  max_hours_per_week?: number;
  course_preferences: Array<{
    course_id: number;
    rank: number;
    course_code: string;
    course_title: string;
  }>;
}

interface UnassignedStudentsProps {
  students: ApprovedApplication[];
}

export const UnassignedStudents: React.FC<UnassignedStudentsProps> = ({ students }) => {
  const getGpaColor = (gpa?: number) => {
    if (!gpa) return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
    if (gpa >= 3.8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (gpa >= 3.5) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (gpa >= 3.0) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const parseAvailability = (weeklyAvailability?: string): string => {
    if (!weeklyAvailability) return 'No availability data';
    
    try {
      const availability = JSON.parse(weeklyAvailability);
      
      // Handle 2D array format [day][timeSlot] where each day has time slots
      if (Array.isArray(availability) && availability.length > 0) {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const availableDays: string[] = [];
        
        availability.forEach((daySlots: boolean[], dayIndex: number) => {
          if (dayIndex < dayNames.length && Array.isArray(daySlots)) {
            // Check if the student is available for any time slot on this day
            const hasAvailability = daySlots.some(slot => slot === true);
            if (hasAvailability) {
              availableDays.push(dayNames[dayIndex]);
            }
          }
        });
        
        return availableDays.length > 0 ? availableDays.join(', ') : 'No availability set';
      }
      
      // Handle object format (legacy)
      if (typeof availability === 'object' && !Array.isArray(availability)) {
        const days = Object.keys(availability).filter(day => 
          Array.isArray(availability[day]) && availability[day].some((slot: boolean) => slot === true)
        );
        
        if (days.length === 0) return 'No availability set';
        
        const dayAbbrev: Record<string, string> = {
          'monday': 'Mon',
          'tuesday': 'Tue', 
          'wednesday': 'Wed',
          'thursday': 'Thu',
          'friday': 'Fri',
          'saturday': 'Sat',
          'sunday': 'Sun'
        };
        
        return days.map(day => dayAbbrev[day.toLowerCase()] || day).join(', ');
      }
      
      return 'Invalid availability format';
    } catch {
      return 'Invalid availability data';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Unassigned Students
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {students.length} students
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Drag students to assign them to courses
        </p>
      </div>

      <Droppable droppableId="unassigned-students">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-4 min-h-64 space-y-3 ${
              snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            {students.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <p>All students have been assigned!</p>
                </div>
              </div>
            ) : (
              students.map((student, index) => (
                <Draggable
                  key={student.user_id}
                  draggableId={`student-${student.user_id}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 cursor-move transition-all ${
                        snapshot.isDragging
                          ? 'shadow-lg rotate-2 border-blue-300 dark:border-blue-500'
                          : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                              {student.name}
                            </h3>
                            {student.gpa && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${getGpaColor(
                                  student.gpa
                                )}`}
                              >
                                GPA: {student.gpa}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <div>{student.email}</div>
                            <div>{student.major}</div>
                            {student.student_number && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {student.student_number}</div>
                            )}
                          </div>

                          {/* Course Preferences */}
                          <div className="mb-3">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Course Preferences:
                            </div>
                            {student.course_preferences.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {student.course_preferences
                                  .sort((a, b) => a.rank - b.rank)
                                  .slice(0, 3)
                                  .map((pref) => (
                                    <span
                                      key={pref.course_id}
                                      className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                                      title={`${pref.course_code} - ${pref.course_title}`}
                                    >
                                      #{pref.rank} {pref.course_code}
                                    </span>
                                  ))}
                                {student.course_preferences.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{student.course_preferences.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">No preferences specified</span>
                            )}
                          </div>

                          {/* Availability Information */}
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="text-gray-600 font-medium">Available: </span>
                                <span className="text-blue-600 font-mono">
                                  {parseAvailability(student.weekly_availability)}
                                </span>
                              </div>
                              {student.max_hours_per_week && (
                                <div>
                                  <span className="text-gray-600 font-medium">Max: </span>
                                  <span className="text-green-600 font-medium">
                                    {student.max_hours_per_week}h/wk
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Drag Handle Icon */}
                        <div className="ml-3 text-gray-400 dark:text-gray-500">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}; 