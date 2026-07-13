import React, { useState, useEffect, useRef } from 'react';
import { taCoordinatorApi } from '../../api/taCoordinatorApi';

interface LabSection {
  lab_section_id?: number;
  section_name: string;
  lab_days: string;
  lab_start_time: string;
  lab_end_time: string;
  ta_id?: number;
  ta_name?: string;
}

interface Course {
  course_id: number;
  code: string;
  title: string;
  term: string;
  instructor_id?: number;
  dept_id?: number;
  max_tas?: number;
  course_days?: string;
  course_time?: string;
  course_frequency?: 'weekly' | 'bi-weekly';
  lab_sections?: LabSection[];
  created_at?: string;
  updated_at?: string;
}

interface Term {
  term_id?: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'upcoming';
  created_at?: string;
  updated_at?: string;
}

interface Instructor {
  user_id: number;
  name: string;
  email: string;
  role: string;
}

const CourseOfferingsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Course scheduling state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [courseFrequency, setCourseFrequency] = useState<string>('');

  // Lab sections state
  const [labSections, setLabSections] = useState<LabSection[]>([]);

  // Form refs
  const codeRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLSelectElement>(null);
  const instructorRef = useRef<HTMLSelectElement>(null);

  // Days of the week options
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Time options (8 AM to 10 PM in 30-minute intervals)
  const timeOptions = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2024-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      timeOptions.push({ value: time, display: displayTime });
    }
  }

  // Helper functions for form management
  const parseCourseDays = (daysString?: string): string[] => {
    if (!daysString) return [];
    return daysString.split(', ').filter(day => daysOfWeek.includes(day));
  };

  const parseCourseTime = (timeString?: string): { start: string; end: string } => {
    if (!timeString || !timeString.includes(' - ')) return { start: '', end: '' };
    const [start, end] = timeString.split(' - ');
    
    // Convert display time back to 24-hour format
    const convertTo24Hour = (time: string): string => {
      const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return '';
      
      let [, hour, minute, period] = match;
      let hour24 = parseInt(hour);
      
      if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
      if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
      
      return `${hour24.toString().padStart(2, '0')}:${minute}`;
    };
    
    return {
      start: convertTo24Hour(start.trim()),
      end: convertTo24Hour(end.trim())
    };
  };

  const resetFormState = () => {
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setCourseFrequency('');
    setLabSections([]);
  };

  const initializeFormState = (course: Course | null) => {
    if (course) {
      setSelectedDays(parseCourseDays(course.course_days));
      const times = parseCourseTime(course.course_time);
      setStartTime(times.start);
      setEndTime(times.end);
      setCourseFrequency(course.course_frequency || '');
      setLabSections(course.lab_sections || []);
    } else {
      resetFormState();
    }
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Lab sections management functions
  const addLabSection = () => {
    const newLabSection: LabSection = {
      section_name: `Lab ${labSections.length + 1}`,
      lab_days: '',
      lab_start_time: '',
      lab_end_time: ''
    };
    setLabSections([...labSections, newLabSection]);
  };

  const removeLabSection = (index: number) => {
    setLabSections(labSections.filter((_, i) => i !== index));
  };

  const updateLabSection = (index: number, field: keyof LabSection, value: string) => {
    const updatedLabSections = [...labSections];
    (updatedLabSections[index] as any)[field] = value;
    setLabSections(updatedLabSections);
  };

  const handleLabDayToggle = (labIndex: number, day: string) => {
    const currentDays = labSections[labIndex].lab_days.split(', ').filter(d => d.length > 0);
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateLabSection(labIndex, 'lab_days', updatedDays.join(', '));
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load courses, terms, and instructors in parallel
      const [coursesData, termsData, instructorsData] = await Promise.all([
        taCoordinatorApi.courses.getAllCourses(),
        taCoordinatorApi.terms.getAllTerms(),
        taCoordinatorApi.instructors.getAll()
      ]);
      
      setCourses(coursesData);
      setTerms(termsData);
      setInstructors(instructorsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading course offerings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeRef.current || !titleRef.current || !termRef.current) {
      return;
    }

    // Validate required schedule fields
    if (selectedDays.length === 0) {
      setError('Please select at least one day for the course schedule');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select both start and end times for the course');
      return;
    }
    if (!courseFrequency) {
      setError('Please select the course frequency');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    // Validate lab sections
    for (let i = 0; i < labSections.length; i++) {
      const labSection = labSections[i];
      if (!labSection.section_name.trim()) {
        setError(`Lab section ${i + 1}: Section name is required`);
        return;
      }
      if (!labSection.lab_days) {
        setError(`Lab section ${i + 1}: Please select at least one day`);
        return;
      }
      if (!labSection.lab_start_time || !labSection.lab_end_time) {
        setError(`Lab section ${i + 1}: Please select both start and end times`);
        return;
      }
      if (labSection.lab_start_time >= labSection.lab_end_time) {
        setError(`Lab section ${i + 1}: End time must be after start time`);
        return;
      }
    }

    // Format the data for submission
    const courseDaysString = selectedDays.join(', ');
    const startTimeDisplay = timeOptions.find(opt => opt.value === startTime)?.display || startTime;
    const endTimeDisplay = timeOptions.find(opt => opt.value === endTime)?.display || endTime;
    const courseTimeString = `${startTimeDisplay} - ${endTimeDisplay}`;

    // Format lab sections for submission
    const formattedLabSections = labSections.map(labSection => {
      const labStartTimeDisplay = timeOptions.find(opt => opt.value === labSection.lab_start_time)?.display || labSection.lab_start_time;
      const labEndTimeDisplay = timeOptions.find(opt => opt.value === labSection.lab_end_time)?.display || labSection.lab_end_time;
      
      return {
        section_name: labSection.section_name,
        lab_days: labSection.lab_days,
        lab_start_time: labStartTimeDisplay,
        lab_end_time: labEndTimeDisplay,
        ta_id: labSection.ta_id || null
      };
    });

    const formData = {
      code: codeRef.current.value,
      title: titleRef.current.value,
      term: termRef.current.value,
      instructor_id: instructorRef.current?.value ? parseInt(instructorRef.current.value) : undefined,
      course_days: courseDaysString,
      course_time: courseTimeString,
      course_frequency: courseFrequency,
      lab_sections: formattedLabSections
    };

    try {
      setSubmitting(true);
      setError(null);

      if (editingCourse && editingCourse.course_id) {
        // Update existing course
        await taCoordinatorApi.courses.updateCourse(editingCourse.course_id, formData);
      } else {
        // Create new course
        await taCoordinatorApi.courses.createCourse(formData);
      }

      // Reload courses and close form
      await loadData();
      setShowForm(false);
      setEditingCourse(null);
      resetFormState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course');
      console.error('Error saving course:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    initializeFormState(course);
    setShowForm(true);
  };

  const handleDelete = async (course: Course) => {
    if (!course.course_id) return;
    
    if (!confirm(`Are you sure you want to delete "${course.code} - ${course.title}"?`)) {
      return;
    }

    try {
      setError(null);
      await taCoordinatorApi.courses.deleteCourse(course.course_id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
      console.error('Error deleting course:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg text-gray-900 dark:text-gray-100">Loading courses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Course Offerings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage course offerings and TA positions for each term
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4">
          <div className="text-red-800 dark:text-red-300">{error}</div>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => {
            setEditingCourse(null);
            initializeFormState(null);
            setShowForm(true);
          }}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md font-medium"
        >
          Add Course Offering
        </button>
      </div>

      {/* Course Offerings Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        {courses.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No courses found. Create your first course using the button above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48">
                  Course
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                  Term
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40">
                  Schedule
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                  Instructor
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-44">
                  Lab Sections
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-28">
                  TA Requests
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {courses.map((course) => (
                <tr key={course.course_id}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {course.code}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]" title={course.title}>
                        {course.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100">
                    {course.term}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100">
                    <div>
                      {course.course_days && (
                        <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                          {course.course_days}
                        </div>
                      )}
                      {course.course_time && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {course.course_time}
                        </div>
                      )}
                      {course.course_frequency && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {course.course_frequency}
                        </div>
                      )}
                      {!course.course_days && !course.course_time && !course.course_frequency && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Not scheduled
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 truncate max-w-[120px]" title={course.instructor_id ? instructors.find(i => i.user_id === course.instructor_id)?.name || 'Unknown' : 'Unassigned'}>
                    {course.instructor_id ? 
                      instructors.find(i => i.user_id === course.instructor_id)?.name || 'Unknown' : 
                      'Unassigned'
                    }
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-900 dark:text-gray-100 max-w-[160px]">
                    <div className="max-h-20 overflow-y-auto">
                      {course.lab_sections && course.lab_sections.length > 0 ? (
                        <div className="space-y-1">
                          {course.lab_sections.map((labSection, index) => (
                            <div key={index} className="text-xs border-b border-gray-100 dark:border-gray-600 pb-1 last:border-b-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {labSection.section_name}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 truncate">
                                {labSection.lab_days}
                              </div>
                              <div className="text-gray-400 dark:text-gray-500 truncate">
                                {labSection.lab_start_time} - {labSection.lab_end_time}
                              </div>
                              {labSection.ta_name && (
                                <div className="text-green-600 dark:text-green-400 truncate">
                                  TA: {labSection.ta_name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">No labs</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                    Set by Instructor
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                      active
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleEdit(course)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 text-left"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(course)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-left"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border border-gray-200 dark:border-gray-600 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[95vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                {editingCourse ? 'Edit Course Offering' : 'Add New Course Offering'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Course Code
                  </label>
                  <input
                    ref={codeRef}
                    type="text"
                    defaultValue={editingCourse?.code || ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="e.g., COSC 111"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Course Name
                  </label>
                  <input
                    ref={titleRef}
                    type="text"
                    defaultValue={editingCourse?.title || ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="e.g., Programming I"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Term
                  </label>
                  <select
                    ref={termRef}
                    defaultValue={editingCourse?.term || ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="">Select Term</option>
                    {terms.map((term) => (
                      <option key={term.term_id || term.name} value={term.name}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Instructor (Optional)
                  </label>
                  <select
                    ref={instructorRef}
                    defaultValue={editingCourse?.instructor_id?.toString() || ''}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">Unassigned</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.user_id} value={instructor.user_id.toString()}>
                        {instructor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course Days *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map((day) => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedDays.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700 dark:checked:bg-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Select the days when the course meets
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Time *
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      required
                    >
                      <option value="">Select Start Time</option>
                      {timeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Time *
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      required
                    >
                      <option value="">Select End Time</option>
                      {timeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.display}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Course Frequency *
                  </label>
                  <select
                    value={courseFrequency}
                    onChange={(e) => setCourseFrequency(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="">Select Frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    How often does the course meet?
                  </p>
                </div>

                {/* Lab Sections */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lab Sections
                    </label>
                    <button
                      type="button"
                      onClick={addLabSection}
                      className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md"
                    >
                      Add Lab Section
                    </button>
                  </div>
                  
                  {labSections.map((labSection, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 mb-3 bg-gray-50 dark:bg-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Lab Section {index + 1}</h4>
                        {labSections.length > 0 && (
                          <button
                            type="button"
                            onClick={() => removeLabSection(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                            Section Name *
                          </label>
                          <input
                            type="text"
                            value={labSection.section_name}
                            onChange={(e) => updateLabSection(index, 'section_name', e.target.value)}
                            className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                            placeholder="e.g., Lab 1, Lab A"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Lab Days *
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {daysOfWeek.map((day) => (
                              <label key={day} className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  checked={labSection.lab_days.split(', ').includes(day)}
                                  onChange={() => handleLabDayToggle(index, day)}
                                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 text-xs dark:bg-gray-600 dark:checked:bg-primary-500"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">{day.slice(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Start Time *
                            </label>
                            <select
                              value={labSection.lab_start_time}
                              onChange={(e) => updateLabSection(index, 'lab_start_time', e.target.value)}
                              className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-600 dark:text-gray-100"
                              required
                            >
                              <option value="">Select Start Time</option>
                              {timeOptions.map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.display}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                              End Time *
                            </label>
                            <select
                              value={labSection.lab_end_time}
                              onChange={(e) => updateLabSection(index, 'lab_end_time', e.target.value)}
                              className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-600 dark:text-gray-100"
                              required
                            >
                              <option value="">Select End Time</option>
                              {timeOptions.map((time) => (
                                <option key={time.value} value={time.value}>
                                  {time.display}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {labSections.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No lab sections added. Click "Add Lab Section" to create lab sections for this course.
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCourse(null);
                      resetFormState();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? (editingCourse ? 'Updating...' : 'Creating...') : (editingCourse ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseOfferingsPage; 