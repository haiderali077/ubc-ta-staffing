import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { allocationApi } from '../../api/allocationApi';

interface LabSectionWithSlots {
  lab_section_id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  term: string;
  section_name: string;
  lab_days: string;
  lab_start_time: string;
  lab_end_time: string;
  instructor_name?: string;
  total_slots: number;
  filled_slots: number;
  remaining_slots: number;
  assigned_students: Array<{
    user_id: number;
    name: string;
    email: string;
    major: string;
    allocation_id: number;
    is_marker?: boolean;
  }>;
}

interface CoursesWithOpenSlotsProps {
  courses: LabSectionWithSlots[];
  onReload?: () => Promise<void>;
}

export const CoursesWithOpenSlots: React.FC<CoursesWithOpenSlotsProps> = ({ courses, onReload }) => {
  const [updatingMarker, setUpdatingMarker] = useState<number | null>(null);

  const toggleMarkerStatus = async (allocationId: number, currentStatus: boolean) => {
    try {
      setUpdatingMarker(allocationId);
      await allocationApi.updateMarkerDesignation(allocationId, !currentStatus);
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Error updating marker status:', error);
      // Could add error handling here
    } finally {
      setUpdatingMarker(null);
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Lab Sections Available for Assignment
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {courses.length} lab sections
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Drop students here to assign them
        </p>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {courses.map((labSection) => (
          <div
            key={labSection.lab_section_id}
            className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
          >
            {/* Lab Section Header */}
            <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                    {labSection.course_code} - {labSection.course_title}
                  </h3>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {labSection.section_name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>{labSection.lab_days} • {labSection.lab_start_time} - {labSection.lab_end_time}</div>
                    {labSection.instructor_name && <div>{labSection.instructor_name}</div>}
                    <div>Term: {labSection.term}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      labSection.assigned_students.length > 0 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {labSection.assigned_students.length} TA{labSection.assigned_students.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Drop Zone for New Students */}
            {labSection.remaining_slots > 0 && (
              <Droppable droppableId={`lab-section-${labSection.lab_section_id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-3 min-h-16 border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver
                        ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    {!snapshot.isDraggingOver && labSection.assigned_students.length === 0 && (
                      <div className="flex items-center justify-center h-12 text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <div className="text-lg mb-1">📋</div>
                          <p className="text-sm">Drop students here</p>
                        </div>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

            {/* Currently Assigned Students */}
            {labSection.assigned_students.length > 0 && (
              <Droppable droppableId={`assigned-lab-section-${labSection.lab_section_id}`}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-3 bg-white dark:bg-gray-800"
                  >
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assigned TAs:
                    </div>
                    <div className="space-y-2">
                      {labSection.assigned_students.map((student, index) => (
                        <Draggable
                          key={student.user_id}
                          draggableId={`assigned-student-${student.user_id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 cursor-move transition-all ${
                                snapshot.isDragging
                                  ? 'shadow-lg rotate-1 border-green-300 dark:border-green-600'
                                  : 'hover:shadow-md hover:border-green-300 dark:hover:border-green-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                      {student.name}
                                    </span>
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                      Assigned
                                    </span>
                                    {student.is_marker && (
                                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full flex items-center gap-1">
                                        ⭐ Marker
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {student.email} • {student.major}
                                  </div>
                                  
                                  {/* Marker toggle button */}
                                  <div className="mt-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMarkerStatus(student.allocation_id, student.is_marker || false);
                                      }}
                                      disabled={updatingMarker === student.allocation_id}
                                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                                        student.is_marker 
                                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                      } ${updatingMarker === student.allocation_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {updatingMarker === student.allocation_id 
                                        ? '...' 
                                        : student.is_marker 
                                          ? 'Remove Marker' 
                                          : 'Make Marker'
                                      }
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Drag Handle */}
                                <div className="ml-2 text-gray-400 dark:text-gray-500">
                                  <svg
                                    className="w-4 h-4"
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
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )}

            {/* Lab Section Full State */}
            {labSection.remaining_slots === 0 && labSection.assigned_students.length === 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center text-gray-500 dark:text-gray-400">
                <div className="text-lg mb-1">🔒</div>
                <p className="text-sm">Lab section is full</p>
              </div>
            )}
          </div>
        ))}

        {/* No lab sections with open slots */}
        {courses.filter(c => c.remaining_slots > 0).length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <p>All lab sections are fully staffed!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 