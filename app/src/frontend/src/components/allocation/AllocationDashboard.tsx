import React, { useState, useEffect, useCallback } from 'react';
import { UnassignedStudents } from './UnassignedStudents';
import { CoursesWithOpenSlots } from './CoursesWithOpenSlots';
import { AllocationFilters } from './AllocationFilters';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { allocationApi } from '../../api/allocationApi';
import { checkAvailabilityConflict, formatConflictMessage, type AvailabilityConflict } from '../../utils/availabilityUtils';

// Updated interfaces to match backend data structure
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

interface FilterState {
  minGpa: number;
  maxGpa: number;
  availability: string[];
  maxRank: number;
  major: string;
}

interface AllocationStats {
  total_approved_applications: number;
  total_assigned_students: number;
  unassigned_students: number;
  total_lab_sections: number;
  total_ta_slots: number;
  filled_slots: number;
}

interface ConflictInfo {
  type: 'schedule' | 'hours' | 'existing_assignment';
  message: string;
  severity: 'warning' | 'error';
}

// Utility functions for conflict detection
const parseStudentAvailability = (weeklyAvailability?: string): Record<string, string[]> => {
  if (!weeklyAvailability) return {};
  
  try {
    return JSON.parse(weeklyAvailability);
  } catch {
    return {};
  }
};

const parseLabDays = (labDays: string): string[] => {
  const dayMap: Record<string, string> = {
    'M': 'monday',
    'T': 'tuesday', 
    'W': 'wednesday',
    'R': 'thursday',
    'F': 'friday',
    'S': 'saturday',
    'U': 'sunday'
  };
  
  return labDays.split('').map(char => dayMap[char]).filter(Boolean);
};

const parseTime = (timeStr: string): number => {
  const [time, period] = timeStr.split(/\s+/);
  const [hours, minutes] = time.split(':').map(Number);
  let hour = hours;
  
  if (period?.toLowerCase() === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period?.toLowerCase() === 'am' && hour === 12) {
    hour = 0;
  }
  
  return hour * 60 + (minutes || 0); // Convert to minutes for easier comparison
};

const timeRangesOverlap = (range1: string, startTime: string, endTime: string): boolean => {
  try {
    const [start1, end1] = range1.split('-');
    const range1Start = parseTime(start1);
    const range1End = parseTime(end1);
    const labStart = parseTime(startTime);
    const labEnd = parseTime(endTime);
    
    return range1Start < labEnd && range1End > labStart;
  } catch {
    return false;
  }
};

const detectConflicts = (
  student: ApprovedApplication,
  targetLabSection: LabSectionWithSlots,
  allLabSections: LabSectionWithSlots[]
): ConflictInfo[] => {
  const conflicts: ConflictInfo[] = [];
  
  // Check if student availability data exists
  const availability = parseStudentAvailability(student.weekly_availability);
  const maxHours = student.max_hours_per_week;
  
  if (Object.keys(availability).length === 0) {
    conflicts.push({
      type: 'schedule',
      message: `${student.name} has no availability information on file`,
      severity: 'warning'
    });
  }
  
  // Check schedule conflicts
  const labDays = parseLabDays(targetLabSection.lab_days);
  
  for (const day of labDays) {
    const studentAvailableSlots = availability[day] || [];
    const hasAvailability = studentAvailableSlots.some(slot => 
      timeRangesOverlap(slot, targetLabSection.lab_start_time, targetLabSection.lab_end_time)
    );
    
    if (!hasAvailability && studentAvailableSlots.length > 0) {
      conflicts.push({
        type: 'schedule',
        message: `Schedule conflict: ${student.name} is not available on ${day} during ${targetLabSection.lab_start_time}-${targetLabSection.lab_end_time}`,
        severity: 'error'
      });
    }
  }
  
  // Check for existing assignments that conflict
  const existingAssignments = allLabSections.filter(section => 
    section.assigned_students.some(s => s.user_id === student.user_id)
  );
  
  for (const existingSection of existingAssignments) {
    const existingDays = parseLabDays(existingSection.lab_days);
    const conflictingDays = labDays.filter(day => existingDays.includes(day));
    
    for (const day of conflictingDays) {
      if (timeRangesOverlap(
        `${existingSection.lab_start_time}-${existingSection.lab_end_time}`,
        targetLabSection.lab_start_time,
        targetLabSection.lab_end_time
      )) {
        conflicts.push({
          type: 'existing_assignment',
          message: `Time conflict: ${student.name} is already assigned to ${existingSection.course_code} ${existingSection.section_name} on ${day} at ${existingSection.lab_start_time}-${existingSection.lab_end_time}`,
          severity: 'error'
        });
      }
    }
  }
  
  // Check hours constraints
  if (maxHours) {
    // Calculate total hours from existing assignments
    let totalHours = 0;
    
    for (const section of existingAssignments) {
      const startMinutes = parseTime(section.lab_start_time);
      const endMinutes = parseTime(section.lab_end_time);
      const sectionHours = (endMinutes - startMinutes) / 60;
      const daysCount = parseLabDays(section.lab_days).length;
      totalHours += sectionHours * daysCount;
    }
    
    // Add hours from target assignment
    const targetStartMinutes = parseTime(targetLabSection.lab_start_time);
    const targetEndMinutes = parseTime(targetLabSection.lab_end_time);
    const targetHours = (targetEndMinutes - targetStartMinutes) / 60;
    const targetDaysCount = labDays.length;
    const newTotalHours = totalHours + (targetHours * targetDaysCount);
    
    if (newTotalHours > maxHours) {
      conflicts.push({
        type: 'hours',
        message: `Hours exceeded: This assignment would give ${student.name} ${newTotalHours.toFixed(1)} hours/week, exceeding their preferred maximum of ${maxHours} hours`,
        severity: 'warning'
      });
    }
  }
  
  return conflicts;
};

export const AllocationDashboard: React.FC = () => {
  const [students, setStudents] = useState<ApprovedApplication[]>([]);
  const [labSections, setLabSections] = useState<LabSectionWithSlots[]>([]);
  const [stats, setStats] = useState<AllocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningStudents, setAssigningStudents] = useState<Set<number>>(new Set());
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [showAvailabilityConflictModal, setShowAvailabilityConflictModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [conflictInfo, setConflictInfo] = useState<{
    conflict: AvailabilityConflict;
    studentName: string;
    labSection: LabSectionWithSlots;
  } | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{
    studentId: number;
    labSectionId: number;
    studentName: string;
    courseCode: string;
  } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    minGpa: 0,
    maxGpa: 5.0, // Increased to accommodate GPAs above 4.0 (some scales go to 4.3 or higher)
    availability: [],
    maxRank: 5,
    major: ''
  });

  // Function to remove duplicate students from lab sections
  const removeDuplicateStudents = (labSections: LabSectionWithSlots[]): LabSectionWithSlots[] => {
    return labSections.map(labSection => ({
      ...labSection,
      assigned_students: labSection.assigned_students.filter((student, index, array) => 
        array.findIndex(s => s.user_id === student.user_id) === index
      )
    }));
  };

  // Load all allocation data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsData, labSectionsData, statsData] = await Promise.all([
        allocationApi.getApprovedApplications(),
        allocationApi.getLabSectionsWithSlots(),
        allocationApi.getAllocationStats(),
      ]);
      
      setStudents(studentsData);
      // Remove duplicate students from lab sections
      const cleanedLabSections = removeDuplicateStudents(labSectionsData);
      setLabSections(cleanedLabSections);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Error loading allocation data:', err);
      setError('Failed to load allocation data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // If dropped in the same place, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Extract student ID from draggableId with better parsing
    const studentIdMatch = draggableId.match(/^(?:student-|assigned-student-)(\d+)$/);
    if (!studentIdMatch) {
      console.error('Invalid draggableId format:', draggableId);
      setError('Invalid drag operation');
      return;
    }
    
    const studentId = parseInt(studentIdMatch[1]);
    if (isNaN(studentId)) {
      console.error('Invalid student ID:', studentIdMatch[1]);
      setError('Invalid student ID');
      return;
    }

    // Prevent multiple simultaneous assignments for the same student
    if (assigningStudents.has(studentId)) {
      setError('Assignment in progress for this student. Please wait.');
      return;
    }
    
    try {
      // Add student to assignment tracking
      setAssigningStudents(prev => new Set(prev).add(studentId));
      
      // Handle assignment to lab section
      if (destination.droppableId.startsWith('lab-section-')) {
        const labSectionIdMatch = destination.droppableId.match(/^lab-section-(\d+)$/);
        if (!labSectionIdMatch) {
          throw new Error('Invalid lab section drop zone');
        }
        
        const labSectionId = parseInt(labSectionIdMatch[1]);
        if (isNaN(labSectionId)) {
          throw new Error('Invalid lab section ID');
        }
        
        // Find the target lab section
        const targetLabSection = labSections.find((labSection: LabSectionWithSlots) => labSection.lab_section_id === labSectionId);
        if (!targetLabSection) {
          throw new Error('Lab section not found');
        }

        // Check if student is already assigned to this lab section
        const isAlreadyAssigned = targetLabSection.assigned_students.some((student: { user_id: number }) => student.user_id === studentId);
        
        if (isAlreadyAssigned) {
          setError('Student is already assigned to this lab section');
          // Remove from assignment tracking
          setAssigningStudents(prev => {
            const newSet = new Set(prev);
            newSet.delete(studentId);
            return newSet;
          });
          return;
        }

        // Find student for conflict detection
        const student = students.find(s => s.user_id === studentId);
        if (!student) {
          setError('Student not found');
          return;
        }

        // Check for availability conflicts using API
        try {
          const studentProfile = await allocationApi.getStudentProfile(studentId);
          if (studentProfile?.weekly_availability) {
            const conflict = checkAvailabilityConflict(
              studentProfile.weekly_availability,
              targetLabSection.lab_days,
              targetLabSection.lab_start_time,
              targetLabSection.lab_end_time
            );

            if (conflict.hasConflict) {
              // Show availability conflict warning modal first
              setConflictInfo({
                conflict,
                studentName: student.name,
                labSection: targetLabSection
              });
              setPendingAssignment({
                studentId,
                labSectionId,
                studentName: student.name,
                courseCode: targetLabSection.course_code
              });
              setShowAvailabilityConflictModal(true);
              return; // Don't proceed with assignment yet
            }
          }
        } catch (availabilityError) {
          console.warn('Could not check availability conflict:', availabilityError);
          // Continue with additional conflict checks even if availability check fails
        }

        // Detect other types of conflicts (schedule, hours, existing assignments)
        const detectedConflicts = detectConflicts(student, targetLabSection, labSections);
        
        if (detectedConflicts.length > 0) {
          setConflicts(detectedConflicts);
          setPendingAssignment({
            studentId,
            labSectionId,
            studentName: student.name,
            courseCode: targetLabSection.course_code
          });
          setShowConflictModal(true);
          return;
        }

        // No conflicts detected, proceed to marker designation modal
        setPendingAssignment({
          studentId,
          labSectionId,
          studentName: student.name,
          courseCode: targetLabSection.course_code
        });
        setShowMarkerModal(true);
        return; // Don't proceed with assignment yet
      }
      
      // Handle moving back to unassigned
      if (destination.droppableId === 'unassigned-students') {
        await unassignStudent(studentId);
      }
    } catch (err) {
      console.error('Error during drag and drop:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
      // Remove from assignment tracking on error
      setAssigningStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
      // Reload data to revert UI changes
      await loadData();
    } finally {
      // Always clean up assignment tracking
      setAssigningStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const assignStudentToLabSection = async (studentId: number, labSectionId: number, isMarker = false) => {
    try {
      await allocationApi.assignStudentToLabSection(studentId, labSectionId, undefined, isMarker);
      // Reload data to reflect changes
      await loadData();
    } catch (error) {
      throw error; // Re-throw to be handled by handleDragEnd
    }
  };

  const unassignStudent = async (studentId: number) => {
    try {
      // Find the allocation ID for this student
      const studentLabSection = labSections.find((labSection: LabSectionWithSlots) => 
        labSection.assigned_students.some((student: { user_id: number }) => student.user_id === studentId)
      );
      
      if (studentLabSection) {
        const assignedStudent = studentLabSection.assigned_students.find((s: { user_id: number; allocation_id: number }) => s.user_id === studentId);
        if (assignedStudent) {
          await allocationApi.unassignStudent(assignedStudent.allocation_id);
          // Reload data to reflect changes
          await loadData();
        }
      }
    } catch (error) {
      throw error; // Re-throw to be handled by handleDragEnd
    }
  };

  // Get list of all assigned student IDs
  const assignedStudentIds = new Set<number>();
  labSections.forEach((labSection: LabSectionWithSlots) => {
    labSection.assigned_students.forEach((student: { user_id: number }) => {
      assignedStudentIds.add(student.user_id);
    });
  });

  // Filter students based on current filter settings
  const filteredStudents = students.filter((student: ApprovedApplication) => {
    // Exclude students who are already assigned to any course (normal behavior)
    if (assignedStudentIds.has(student.user_id)) {
      return false;
    }

    // Filter by major
    if (filters.major && student.major !== filters.major) {
      return false;
    }
    
    // Filter by GPA (if available)
    if (student.gpa !== undefined) {
      if (student.gpa < filters.minGpa || student.gpa > filters.maxGpa) {
        return false;
      }
    }
    
    // Filter by course preference rank
    if (filters.maxRank < 5) {
      const hasPreferenceInRange = student.course_preferences.some((pref: { rank: number }) => pref.rank <= filters.maxRank);
      if (!hasPreferenceInRange) {
        return false;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">TA Allocation</h1>
        <p className="text-gray-600 dark:text-gray-400">Assign approved students to lab sections requiring TAs</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500 dark:border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Available Students</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unassigned_students}</p>
              </div>
              <div className="text-blue-400">👥</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-green-500 dark:border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Assigned Students</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total_assigned_students}</p>
              </div>
              <div className="text-green-400">✅</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-purple-500 dark:border-purple-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total TA Slots</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total_ta_slots}</p>
              </div>
              <div className="text-purple-400">🎯</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-orange-500 dark:border-orange-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Fill Rate</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.total_ta_slots > 0 ? Math.round((stats.filled_slots / stats.total_ta_slots) * 100) : 0}%
                </p>
              </div>
              <div className="text-orange-400">📊</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <AllocationFilters filters={filters} onFiltersChange={setFilters} />

      {/* Drag and Drop Interface */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unassigned Students */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Available Students ({filteredStudents.length})
            </h2>
            <UnassignedStudents students={filteredStudents} />
          </div>

          {/* Lab Sections Available for Assignment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Lab Sections Available for Assignment ({labSections.length})
            </h2>
            <CoursesWithOpenSlots courses={labSections} onReload={loadData} />
          </div>
        </div>
      </DragDropContext>

      {/* Information Note */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="text-blue-400 dark:text-blue-300 mr-3">ℹ️</div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">How to Use</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Drag students from the left panel to lab sections on the right to assign them. 
              You can also drag students back to the unassigned list to remove assignments.
              Students' course preferences are shown to help with optimal matching.
            </p>
          </div>
        </div>
      </div>

      {/* Availability Conflict Warning Modal */}
      {showAvailabilityConflictModal && conflictInfo && pendingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="text-yellow-500 mr-3">⚠️</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Availability Conflict Warning
                </h2>
              </div>
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1"
                onClick={() => {
                  setShowAvailabilityConflictModal(false);
                  setConflictInfo(null);
                  // Clean up assignment tracking for cancelled conflict assignment
                  if (pendingAssignment) {
                    setAssigningStudents(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(pendingAssignment.studentId);
                      return newSet;
                    });
                  }
                  setPendingAssignment(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  <strong>{conflictInfo.studentName}</strong> has marked themselves as unavailable during:
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>Lab Schedule:</strong> {conflictInfo.labSection.lab_days} • {conflictInfo.labSection.lab_start_time} - {conflictInfo.labSection.lab_end_time}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                    <strong>Conflict:</strong> {formatConflictMessage(conflictInfo.conflict)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can still assign the student, but they may need to adjust their schedule 
                  or you may want to consider their availability preferences.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAvailabilityConflictModal(false);
                  setConflictInfo(null);
                  // Clean up assignment tracking for cancelled conflict assignment
                  if (pendingAssignment) {
                    setAssigningStudents(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(pendingAssignment.studentId);
                      return newSet;
                    });
                  }
                  setPendingAssignment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel Assignment
              </button>
              <button
                onClick={() => {
                  setShowAvailabilityConflictModal(false);
                  setConflictInfo(null);
                  // Continue to marker designation modal
                  setShowMarkerModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Continue Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marker Designation Modal */}
      {showMarkerModal && pendingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Assign TA to {pendingAssignment.courseCode}
              </h2>
              <button
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-1"
                onClick={() => {
                  setShowMarkerModal(false);
                  setPendingAssignment(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Assigning <strong>{pendingAssignment.studentName}</strong> to {pendingAssignment.courseCode}
                </p>
              </div>
              
              <div className="mb-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="designate-marker"
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                      Designate as Course Marker
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This TA will be responsible for marking assignments and exams
                    </p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMarkerModal(false);
                  if (pendingAssignment) {
                    // Clean up assignment tracking for cancelled assignment
                    setAssigningStudents(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(pendingAssignment.studentId);
                      return newSet;
                    });
                  }
                  setPendingAssignment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const isMarker = (document.getElementById('designate-marker') as HTMLInputElement)?.checked || false;
                    await assignStudentToLabSection(pendingAssignment.studentId, pendingAssignment.labSectionId, isMarker);
                    setShowMarkerModal(false);
                    // Clean up assignment tracking for successful assignment
                    if (pendingAssignment) {
                      setAssigningStudents(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(pendingAssignment.studentId);
                        return newSet;
                      });
                    }
                    setPendingAssignment(null);
                  } catch (err) {
                    console.error('Error assigning student:', err);
                    setError(err instanceof Error ? err.message : 'Failed to assign student');
                    setShowMarkerModal(false);
                    // Clean up assignment tracking for failed assignment
                    if (pendingAssignment) {
                      setAssigningStudents(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(pendingAssignment.studentId);
                        return newSet;
                      });
                    }
                    setPendingAssignment(null);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Assign TA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Detection Modal */}
      {showConflictModal && pendingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-red-600">
                ⚠️ Assignment Conflicts Detected
              </h2>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl p-1"
                onClick={() => {
                  setShowConflictModal(false);
                  setPendingAssignment(null);
                  setConflicts([]);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-4">
                  The following conflicts were detected when trying to assign <strong>{pendingAssignment.studentName}</strong> to <strong>{pendingAssignment.courseCode}</strong>:
                </p>
                
                <div className="space-y-3">
                  {conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        conflict.severity === 'error' 
                          ? 'bg-red-50 border-red-400' 
                          : 'bg-yellow-50 border-yellow-400'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {conflict.severity === 'error' ? (
                            <span className="text-red-500 text-lg">🚫</span>
                          ) : (
                            <span className="text-yellow-500 text-lg">⚠️</span>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            conflict.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {conflict.type === 'schedule' && 'Schedule Conflict'}
                            {conflict.type === 'hours' && 'Hours Constraint'}
                            {conflict.type === 'existing_assignment' && 'Existing Assignment Conflict'}
                          </p>
                          <p className={`mt-1 text-sm ${
                            conflict.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {conflict.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {conflicts.some(c => c.severity === 'error') && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ❌ Critical conflicts detected. This assignment should not proceed without resolving these issues.
                    </p>
                  </div>
                )}
                
                {conflicts.every(c => c.severity === 'warning') && (
                  <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Warnings detected. You may proceed with caution.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setPendingAssignment(null);
                  setConflicts([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel Assignment
              </button>
              
              {conflicts.every(c => c.severity === 'warning') && (
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setShowMarkerModal(true);
                    setConflicts([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Proceed Despite Warnings
                </button>
              )}
              
              {conflicts.some(c => c.severity === 'error') && (
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setShowMarkerModal(true);
                    setConflicts([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Override Conflicts
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 