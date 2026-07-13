/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Bulk Upload Page Component
 * 
 * This component provides a user interface for bulk uploading course schedules
 * from CSV files. It includes:
 * - File selection and validation
 * - CSV parsing and preview
 * - Error reporting and download
 * - Confirmation workflow
 * - Automatic redirect to dashboard after successful upload
 * 
 * The upload process has three stages:
 * 1. File selection and validation
 * 2. Preview of parsed data
 * 3. Confirmation and processing
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

/**
 * Interface for validation errors returned by the backend
 * Each error includes the row number and specific error messages
 */
interface CsvRowData {
  term?: string;
  subject?: string;
  course?: string;
  secNo?: string;
  instructor?: string;
}

interface ValidationError {
  row: number;                    // Row number in CSV (1-indexed for user)
  errors: string[];              // Array of error messages for this row
  data?: CsvRowData;             // Original row data for reference
}

/**
 * Interface for parsed course data shown in preview
 * This is the cleaned data ready for import
 */
interface PreviewData {
  term: string;                  // Academic term
  courseCode: string;            // Full course code (e.g., "BIOL 495")
  sectionCode: string;           // Section identifier
  instructorName: string;        // Instructor's full name
  days: string;                  // Meeting days
  startTime: string;             // Class start time
  endTime: string;               // Class end time
  location: string;              // Physical location or "Online"
  deliveryMode: string;          // "Online Learning" or "On campus"
  hasSecondaryActivity: boolean; // Whether has lab/tutorial
}

/**
 * Interface for the initial upload response
 * Contains validation results and preview data
 */
interface UploadResponse {
  success: boolean;
  preview?: boolean;              // True if this is preview data
  message?: string;               // User-friendly message
  error?: string;                // Error message
  totalRows?: number;             // Total rows processed
  validRows?: number;             // Number of valid rows
  invalidRows?: number;           // Number of invalid rows
  data?: PreviewData[];          // Preview data (first 20 rows)
  errors?: ValidationError[];     // Validation errors
  uploadId?: string;             // Unique ID for this upload session
}

/**
 * Interface for the confirmation response
 * Contains processing results and statistics
 */
interface ProcessingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ConfirmResponse {
  success: boolean;
  message?: string;
  error?: string;
  results?: {
    coursesCreated: number;
    coursesUpdated: number;
    sectionsCreated: number;
    instructorsCreated: number;
    errors: Array<{
      course: string;
      error: string;
    }>;
  };
}

const BulkUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle file selection
   * Validates file type and updates state
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setPreviewData(null);
      setValidationErrors(null);
      setUploadStats(null);
    }
  };

  /**
   * Handle file upload and validation
   * Sends the file to the backend for parsing and validation
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/bulk-upload/course-schedule', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result: UploadResponse = await response.json();

      if (response.ok && result.success) {
        // Store preview data and upload ID
        setPreviewData(result.data || []);
        setUploadId(result.uploadId || null);
        setUploadStats({
          totalRows: result.totalRows || 0,
          validRows: result.data?.length || 0,
          invalidRows: 0
        });
        toast.success('File validated successfully. Please review and confirm.');
      } else if (result.errors && result.errors.length > 0) {
        // Handle validation errors
        setValidationErrors(result.errors);
        setUploadStats({
          totalRows: (result.validRows || 0) + (result.invalidRows || 0),
          validRows: result.validRows || 0,
          invalidRows: result.invalidRows || 0
        });
        setError(`Validation failed for ${result.invalidRows} rows. Please review the errors.`);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('An error occurred while uploading the file. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle confirmation of validated data
   * Sends the upload ID to process the stored data
   */
  const handleConfirm = async () => {
    if (!uploadId || !previewData || previewData.length === 0) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      
      console.log('[BulkUploadPage] Confirming upload with ID:', uploadId);

      const response = await fetch('/api/bulk-upload/course-schedule/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ uploadId }),
      });

      const result: ConfirmResponse = await response.json();

      if (response.ok && result.success) {
        // Show success statistics
        const { results } = result;
        const successMessage = `
          Upload completed successfully!
          - ${results?.coursesCreated || 0} courses created
          - ${results?.coursesUpdated || 0} courses updated
          - ${results?.sectionsCreated || 0} lab sections created
          - ${results?.instructorsCreated || 0} new instructors created
          ${results?.errors && results.errors.length > 0 ? `\n- ${results.errors.length} errors encountered` : ''}
        `;
        
        toast.success(successMessage);
        
        console.log('[BulkUploadPage] Upload successful, redirecting to dashboard...');
        
        // Reset form state
        handleCancel();
        
        // Redirect to dashboard after a short delay to allow toast to be seen
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } else {
        const errorMessage = result.error || 'Failed to confirm upload';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('[BulkUploadPage] Upload confirmation failed:', result);
      }
    } catch (error) {
      console.error('[BulkUploadPage] Confirmation error:', error);
      setError('An error occurred while processing the upload. Please try again.');
      toast.error('An error occurred while processing the upload. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle cancellation of upload process
   * Resets all state to initial values
   */
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setUploadId(null);
    setValidationErrors([]);
    setUploadStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Download CSV template file
   * Provides users with the expected format
   */
  const downloadTemplate = () => {
    window.location.href = '/api/bulk-upload/template';
  };

  /**
   * Download error report as CSV
   * Includes row numbers and error details
   */
  const downloadErrorReport = () => {
    if (!validationErrors || validationErrors.length === 0) return;

    // Build CSV content with error details
    const csvContent = [
      ['Row', 'Errors', 'Term', 'Subject', 'Course', 'Section', 'Instructor'],
      ...validationErrors.map(error => [
        error.row,
        error.errors.join('; '),
        error.data?.term || '',
        error.data?.subject || '',
        error.data?.course || '',
        error.data?.secNo || '',
        error.data?.instructor || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course_upload_errors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk Upload Course Schedule</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Upload a CSV file to bulk import course schedules and instructor assignments
        </p>
      </div>

      {/* Instructions Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300">
          <li>Download the CSV template to see the required format</li>
          <li>Fill in your course schedule data following the template structure</li>
          <li>Upload the completed CSV file</li>
          <li>Review the preview to ensure data is correct</li>
          <li>Confirm to import the courses into the system</li>
        </ol>
        <div className="mt-4">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Section */}
      {!previewData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload CSV File</h3>
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                    Click to upload
                  </span>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">CSV file up to 50MB</p>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Selected file:</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
              disabled={!selectedFile}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || processing}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Upload & Validate'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {uploadStats && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Validation Results</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{uploadStats.totalRows}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-3">
              <p className="text-sm text-green-600 dark:text-green-400">Valid Rows</p>
              <p className="text-2xl font-semibold text-green-900 dark:text-green-300">{uploadStats.validRows}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
              <p className="text-sm text-red-600 dark:text-red-400">Invalid Rows</p>
              <p className="text-2xl font-semibold text-red-900 dark:text-red-300">{uploadStats.invalidRows}</p>
            </div>
          </div>

          {validationErrors && validationErrors.length > 0 && (
            <>
              <div className="border-t dark:border-gray-600 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">Validation Errors</h4>
                  <button
                    onClick={downloadErrorReport}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Download Error Report
                  </button>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-200 dark:border-red-800">
                        <th className="text-left py-2 pr-4 text-red-800 dark:text-red-200">Row</th>
                        <th className="text-left py-2 text-red-800 dark:text-red-200">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <tr key={index} className="border-b border-red-100 dark:border-red-800/50">
                          <td className="py-2 pr-4 font-mono text-red-900 dark:text-red-200">{error.row}</td>
                          <td className="py-2">
                            <ul className="list-disc list-inside">
                              {error.errors.map((msg, i) => (
                                <li key={i} className="text-red-700 dark:text-red-300">{msg}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validationErrors.length > 10 && (
                    <p className="mt-2 text-center text-red-600 dark:text-red-400 text-xs">
                      Showing first 10 errors. Download the full report to see all {validationErrors.length} errors.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview Section */}
      {previewData && previewData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Preview (First 20 Rows)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Term
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mode
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.map((course, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.term}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">{course.courseCode}</div>
                        <div className="text-gray-500 dark:text-gray-400">Section {course.sectionCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.instructorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div>{course.days}</div>
                        <div className="text-gray-500 dark:text-gray-400">{course.startTime} - {course.endTime}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {course.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        course.deliveryMode === 'Online Learning' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}>
                        {course.deliveryMode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Confirm Import'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUploadPage;

/**
 * Component Features:
 * 
 * 1. File Upload:
 *    - Accepts only CSV files
 *    - Maximum 50MB file size
 *    - Shows file info after selection
 * 
 * 2. Validation:
 *    - Server-side validation of all rows
 *    - Shows validation summary with statistics
 *    - Downloadable error report for failed rows
 * 
 * 3. Preview:
 *    - Shows first 20 rows of parsed data
 *    - Displays course details in table format
 *    - Color-coded delivery mode badges
 * 
 * 4. Confirmation:
 *    - Two-step process (preview then confirm)
 *    - Shows processing results with counts
 *    - Automatic redirect to dashboard after success
 * 
 * 5. Error Handling:
 *    - Toast notifications for all actions
 *    - Detailed error tables with row numbers
 *    - CSV download of error details
 */