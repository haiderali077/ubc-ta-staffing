import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { instructorApi, type InstructorCourse, type TARequestSubmission } from '../../api/instructorApi';
import { AcademicCapIcon, BookOpenIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export const SubmitTARequestPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    course_id: '',
    hours_required: '1',
    qualifications: '',
    lab_tutorial_skills: '',
    notes: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await instructorApi.getCourses();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setError('Failed to load your courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const requestData: TARequestSubmission = {
        course_id: parseInt(formData.course_id),
        hours_required: parseInt(formData.hours_required),
        qualifications: formData.qualifications.trim() || undefined,
        lab_tutorial_skills: formData.lab_tutorial_skills.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };

      const result = await instructorApi.submitTARequest(requestData);
      setSuccess(result.message);
      
      // Reset form
      setFormData({
        course_id: '',
        hours_required: '1',
        qualifications: '',
        lab_tutorial_skills: '',
        notes: ''
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Failed to submit TA request:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit TA request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'instructor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You need instructor privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <AcademicCapIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Submit TA Request</h1>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Submit a request for Teaching Assistant support for one of your courses. 
            Please provide detailed information to help us find the best suited TAs.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Available</h3>
              <p className="text-gray-500">You haven't been assigned to any courses this term.</p>
              <p className="text-gray-500">Contact your TA Coordinator to get assigned to courses.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Course Selection */}
              <div>
                <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course *
                </label>
                <select
                  id="course_id"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.code} - {course.title} ({course.term})
                    </option>
                  ))}
                </select>
              </div>

              {/* TA Hours Required */}
              <div>
                <label htmlFor="hours_required" className="block text-sm font-medium text-gray-700 mb-2">
                  TA Hours Required per Week *
                </label>
                                  <input
                    type="number"
                    id="hours_required"
                    name="hours_required"
                    value={formData.hours_required}
                    onChange={handleInputChange}
                    min="1"
                    max="80"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">Based on expected enrollment and marking workload</p>
              </div>

              {/* Required Qualifications */}
              <div>
                <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-2">
                  Required Qualifications
                </label>
                <textarea
                  id="qualifications"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="e.g., Previous experience with CPSC 110, Strong knowledge of Python programming, Experience with algorithm design..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Specify required previous courses, programming languages, or specific skills
                </p>
              </div>

              {/* Lab/Tutorial Skills */}
              <div>
                <label htmlFor="lab_tutorial_skills" className="block text-sm font-medium text-gray-700 mb-2">
                  Lab/Tutorial Skills Needed
                </label>
                <textarea
                  id="lab_tutorial_skills"
                  name="lab_tutorial_skills"
                  value={formData.lab_tutorial_skills}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="e.g., Lab instruction experience, Tutorial facilitation skills, Debugging assistance, Equipment setup..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Describe specific lab or tutorial skills required
                </p>
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any additional requirements, preferences, or information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting || !formData.course_id}
                  className="flex-1 bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit TA Request'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitTARequestPage; 