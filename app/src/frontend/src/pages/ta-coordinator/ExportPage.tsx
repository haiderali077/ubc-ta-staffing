// ExportPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  BarChart3,
  Users,
  Calendar,
  Eye,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
  PieChart,
  HelpCircle
} from 'lucide-react';
import type {
  Analytics,
  ExtendedAnalytics,
  PreviewData,
  Filters,
  ExportButtonProps,
  ErrorDetails
} from './exportTypes';
import {
  calculateExtendedAnalytics,
  applyFiltersToAnalytics,
  formatErrorMessage
} from './exportAnalyticsUtils';
import { AnalyticsDashboard } from './exportAnalytics';
import {
  generateDummyAnalytics,
  generateDummyCourseAllocations,
  generateDummyStudentAssignments,
  generateDummyHoursComparison
} from './exportDummyData';

interface AnalyticsResponse {
  data: Analytics;
  rawData?: {
    allocations?: unknown[];
    students?: unknown[];
    courses?: unknown[];
    departments?: unknown[];
  };
  term?: string;
}

// Export Button Component
const ExportButton: React.FC<ExportButtonProps & {
  onPreview: (reportType: string) => void;
  onExport: (reportType: string, format: 'csv' | 'pdf') => void;
  loading: boolean;
}> = ({ reportType, title, description, icon: Icon, onPreview, onExport, loading }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-lg transition-all">
    <div className="flex items-center mb-4">
      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
    <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
    <div className="flex gap-2 mb-3">
      <button
        onClick={() => onPreview(reportType)}
        disabled={loading}
        className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-sm transition-colors"
      >
        <Eye className="h-4 w-4 mr-1" />
        Preview
      </button>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onExport(reportType, 'csv')}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
      >
        <Download className="h-4 w-4 mr-1" />
        CSV
      </button>
      <button
        onClick={() => onExport(reportType, 'pdf')}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
      >
        <FileText className="h-4 w-4 mr-1" />
        PDF
      </button>
    </div>
  </div>
);

// Error Alert Component
const ErrorAlert: React.FC<{
  error: ErrorDetails;
  onClose: () => void;
}> = ({ error, onClose }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
    <div className="flex items-start">
      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{error.message}</p>
        {error.details && (
          <p className="text-sm mt-1 text-red-600">{error.details}</p>
        )}
        {error.code && (
          <p className="text-xs mt-2 text-red-500">Error Code: {error.code}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  </div>
);

export const ExportPage: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState('');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<ExtendedAnalytics | null>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<ExtendedAnalytics | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [useDummyData, setUseDummyData] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [departments, setDepartments] = useState<string[]>(['Computer Science', 'Mathematics', 'Data Science']);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    fetchAvailableTerms();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTerm, filters, useDummyData]);

  useEffect(() => {
    if (useDummyData) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  }, [useDummyData]);

  // Updated fetchDepartments to handle department data properly
  const fetchDepartments = async () => {
    if (useDummyData) {
      setDepartments(['Computer Science', 'Mathematics', 'Data Science']);
      return;
    }

    try {
      // Use the same analytics endpoint to get consistent department data
      const response = await fetch('/api/ta-coordinator/export/analytics?includeRawData=true', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result: AnalyticsResponse = await response.json();
        // Extract unique departments from raw data
        const departments = result.rawData?.departments || [];
        const uniqueDepartments = [...new Set(departments.map((dept: any) => 
          dept.department_name || dept.name || 'Unknown'
        ))].filter(name => name !== 'Unknown');
        
        setDepartments(uniqueDepartments.length > 0 ? uniqueDepartments : ['Computer Science', 'Mathematics', 'Data Science']);
      } else {
        // Fallback to hardcoded departments if API fails
        setDepartments(['Computer Science', 'Mathematics', 'Data Science']);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments(['Computer Science', 'Mathematics', 'Data Science']);
    }
  };

  const fetchAvailableTerms = async () => {
    if (useDummyData) {
      setAvailableTerms(['2025W1', '2025W2', '2024W1', '2024W2', '2024S']);
      return;
    }

    try {
      const response = await fetch('/api/ta-coordinator/export/terms', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setAvailableTerms(result.data || []);
      }
    } catch (error) {
      setError(formatErrorMessage(error));
    }
  };

  // Updated fetchAnalytics function with raw data support
  const fetchAnalytics = async () => {
    if (useDummyData) {
      const dummyAnalytics = generateDummyAnalytics();
      const filteredAnalytics = applyFiltersToAnalytics(dummyAnalytics, filters);
      setAnalytics(filteredAnalytics);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedTerm) params.append('term', selectedTerm);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.minHours) params.append('minHours', filters.minHours.toString());
      if (filters.maxHours) params.append('maxHours', filters.maxHours.toString());
      // Add parameter to request raw data for charts
      params.append('includeRawData', 'true');
      
      const url = `/api/ta-coordinator/export/analytics${params.toString() ? '?' + params.toString() : ''}`;
        
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result: AnalyticsResponse = await response.json();
        const basicAnalytics = result.data as Analytics;
        
        // Calculate extended analytics with raw data for better chart generation
        const extendedAnalytics = calculateExtendedAnalytics(basicAnalytics, result.rawData);
        
        // Apply filters
        const filteredAnalytics = applyFiltersToAnalytics(extendedAnalytics, filters, result.rawData);
        
        setAnalytics(filteredAnalytics);
      } else {
        const errorData = await response.json();
        setError(formatErrorMessage({ response: { status: response.status, data: errorData } }));
      }
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (reportType: string) => {
    if (useDummyData) {
      let dummyData: any[];
      switch (reportType) {
        case 'course-allocations':
          dummyData = generateDummyCourseAllocations();
          break;
        case 'student-assignments':
          dummyData = generateDummyStudentAssignments();
          break;
        case 'hours-comparison':
          dummyData = generateDummyHoursComparison();
          break;
        default:
          dummyData = [];
      }
      
      setPreviewData({
        type: reportType,
        data: {
          data: dummyData.slice(0, 5),
          total: dummyData.length,
          preview: true,
          term: selectedTerm || 'All Terms'
        }
      });
      setActiveTab('preview');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedTerm) params.append('term', selectedTerm);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      
      const url = `/api/ta-coordinator/export/preview/${reportType}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setPreviewData({
          type: reportType,
          data: result
        });
        setActiveTab('preview');
      } else {
        const errorData = await response.json();
        setError(formatErrorMessage({ response: { status: response.status, data: errorData } }));
      }
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportType: string, format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      setError(null);
      
      // For dummy data, generate and download locally
      if (useDummyData) {
        let data: any[];
        let title: string;
        
        switch (reportType) {
          case 'course-allocations':
            data = generateDummyCourseAllocations();
            title = 'Course Allocations Report';
            break;
          case 'student-assignments':
            data = generateDummyStudentAssignments();
            title = 'Student Assignments Report';
            break;
          case 'hours-comparison':
            data = generateDummyHoursComparison();
            title = 'Hours Comparison Report';
            break;
          default:
            throw new Error('Invalid report type');
        }
        
        if (format === 'csv') {
          downloadCSV(data, reportType);
        } else {
          downloadPDF(data, title);
        }
        return;
      }
      
      // For real data, fetch from API
      const params = new URLSearchParams();
      params.append('format', format);
      if (selectedTerm) params.append('term', selectedTerm);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      
      const url = `/api/ta-coordinator/export/${reportType}?${params.toString()}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': format === 'pdf' ? 'text/html' : 'text/csv'
        }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        // Check if the response is JSON (error) or actual file data
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }
        
        if (format === 'csv') {
          // For CSV, download directly
          const text = await response.text();
          const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${reportType}_${selectedTerm || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          URL.revokeObjectURL(link.href);
        } else {
          // For PDF (HTML), open in new window for printing
          const htmlContent = await response.text();
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            // Add print styles
            const style = printWindow.document.createElement('style');
            style.textContent = `
              @media print {
                body { margin: 0; }
                .container { box-shadow: none; }
                @page { margin: 0.5in; }
              }
            `;
            printWindow.document.head.appendChild(style);
            setTimeout(() => {
              printWindow.print();
            }, 250);
          }
        }
      } else {
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }
        setError(formatErrorMessage({ message: errorMessage, code: response.status.toString() }));
      }
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to download CSV
  const downloadCSV = (data: any[], reportType: string) => {
    if (!data || data.length === 0) {
      setError({ message: 'No data to export', details: 'Please ensure there is data available for the selected filters.' });
      return;
    }

    // Get headers, excluding complex objects
    const headers = Object.keys(data[0]).filter(key => 
      !['assigned_students', 'assignments'].includes(key) && 
      typeof data[0][key] !== 'object'
    );
    
    // Create CSV content
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.map(h => `"${h.replace(/_/g, ' ').toUpperCase()}"`).join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }
        
        // Convert to string and escape
        value = String(value);
        
        // Escape quotes and wrap in quotes if contains comma, newline, or quotes
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`;
        } else {
          value = `"${value}"`;
        }
        
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_${selectedTerm || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Helper function to download PDF
  const downloadPDF = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      setError({ message: 'No data to export', details: 'Please ensure there is data available for the selected filters.' });
      return;
    }

    const headers = Object.keys(data[0]).filter(key => 
      !['assigned_students', 'assignments'].includes(key) && 
      typeof data[0][key] !== 'object'
    );
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            padding: 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
          }
          h1 { 
            color: #1e40af; 
            font-size: 28px;
            margin-bottom: 10px;
          }
          .metadata {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 30px;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin-top: 20px;
            font-size: 14px;
          }
          th, td { 
            border: 1px solid #e5e7eb; 
            padding: 12px; 
            text-align: left; 
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.05em;
          }
          tr:nth-child(even) { 
            background-color: #f9fafb; 
          }
          tr:hover {
            background-color: #f3f4f6;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px; 
            color: #6b7280;
            text-align: center;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .container { padding: 0; }
            @page { 
              margin: 0.5in;
              size: landscape;
            }
            tr:hover { background-color: transparent; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          <div class="metadata">
            <p>Generated on: ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p>Term: ${selectedTerm || 'All Terms'}</p>
            <p>Total Records: ${data.length}</p>
            ${filters.department ? `<p>Department: ${filters.department}</p>` : ''}
            ${filters.status ? `<p>Status: ${filters.status}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(h => {
                    const value = row[h];
                    let displayValue = value;
                    
                    // Format specific types
                    if (typeof value === 'number' && h.includes('rate')) {
                      displayValue = value + '%';
                    } else if (value === null || value === undefined) {
                      displayValue = '-';
                    }
                    
                    return `<td>${displayValue}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This report was generated by AllocAid TA Management System</p>
            <p>© ${new Date().getFullYear()} AllocAid. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      setError({ 
        message: 'Unable to open print window', 
        details: 'Please check your popup blocker settings and try again.' 
      });
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    fetchAnalytics();
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast notification */}
        {showToast && (
          <div className="fixed top-4 right-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center animate-pulse">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{useDummyData ? 'Using dummy data for demo purposes' : 'Using live data'}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
            <div className="flex items-center gap-4">
              {/* Legend/Help Button */}
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Show legend and help"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Legend
              </button>
              
              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filters).filter(k => filters[k as keyof Filters]).length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {Object.keys(filters).filter(k => filters[k as keyof Filters]).length}
                  </span>
                )}
              </button>
              
              {/* Dummy Data Toggle */}
              <label className="flex items-center cursor-pointer">
                <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">Use Dummy Data</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={useDummyData}
                    onChange={(e) => setUseDummyData(e.target.checked)}
                  />
                  <div className={`block w-14 h-8 rounded-full ${useDummyData ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${useDummyData ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
              
              {/* Refresh Button */}
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Term Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Term:</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Terms</option>
              {availableTerms.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend/Help Panel */}
        {showLegend && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Metrics & Terminology Guide
              </h3>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Analytics Metrics */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Analytics Metrics</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Number of courses requiring TAs in the selected term</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Number of students assigned as TAs</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Allocations</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Number of TA positions filled</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Unmet Requests</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Number of TA positions still needed</dd>
                  </div>
                </dl>
              </div>
              
              {/* Calculated Metrics */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Calculated Metrics</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Hours/Student</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Average hours assigned per TA (Total Hours ÷ Students)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg TAs/Course</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Average TAs per course (Allocations ÷ Courses)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Percentage of TA requests filled (Allocations ÷ Total Requests)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilization Rate</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Percentage of requested hours assigned (Assigned ÷ Requested)</dd>
                  </div>
                </dl>
              </div>
              
              {/* Report Types */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Report Types</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Course Allocations</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">TA assignments by course with instructor details</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Student Assignments</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Courses assigned to each TA with workload</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Hours Comparison</dt>
                    <dd className="text-sm text-gray-500 dark:text-gray-500">Requested vs assigned hours by course</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Understanding Trends</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Trend percentages show changes from the previous term. Green indicates growth, 
                    red indicates reduction. Trends are only shown when comparing specific terms.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Hours Calculation</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Each TA slot is typically calculated as 10 hours per week. Total hours are 
                    based on the number of slots multiplied by this standard allocation.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tips */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Tips
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Use filters to narrow down data to specific departments or statuses</li>
                <li>Export data in CSV format for further analysis in Excel</li>
                <li>PDF exports open in a new window for printing or saving</li>
                <li>Toggle "Use Dummy Data" to see sample data without affecting the database</li>
              </ul>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={filters.department || ''}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Hours</label>
                  <input
                    type="number"
                    value={filters.minHours || ''}
                    onChange={(e) => setFilters({...filters, minHours: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Hours</label>
                  <input
                    type="number"
                    value={filters.maxHours || ''}
                    onChange={(e) => setFilters({...filters, maxHours: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="20"
                    min="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <BarChart3 className="inline h-4 w-4 mr-2" />
                Analytics Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <FileText className="inline h-4 w-4 mr-2" />
                Export Reports
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Eye className="inline h-4 w-4 mr-2" />
                Data Preview
              </button>
            </nav>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorAlert error={error} onClose={() => setError(null)} />
        )}

        {/* Content based on active tab */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Analytics Dashboard */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              analytics={analytics}
              loading={loading}
              onRefresh={fetchAnalytics}
              filters={filters}
              previousAnalytics={previousAnalytics}
              useDummyData={useDummyData}
            />
          )}

          {/* Export Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <ExportButton
                  reportType="course-allocations"
                  title="Course Allocations"
                  description="Export course-wise TA allocation data including instructor assignments and student details."
                  icon={Calendar}
                  onPreview={fetchPreview}
                  onExport={exportReport}
                  loading={loading}
                />
                <ExportButton
                  reportType="student-assignments"
                  title="Student Assignments"
                  description="Export student assignment data including course details and workload information."
                  icon={Users}
                  onPreview={fetchPreview}
                  onExport={exportReport}
                  loading={loading}
                />
                <ExportButton
                  reportType="hours-comparison"
                  title="Hours Comparison"
                  description="Compare hours requested vs assigned across all courses with utilization rates."
                  icon={BarChart3}
                  onPreview={fetchPreview}
                  onExport={exportReport}
                  loading={loading}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Export Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300">
                  <div>
                    <h4 className="font-semibold mb-2">CSV Export</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Compatible with Excel, Google Sheets</li>
                      <li>Includes all data fields</li>
                      <li>Easy to filter and analyze</li>
                      <li>Supports bulk data operations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">PDF Export</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Professional formatting</li>
                      <li>Ready for printing</li>
                      <li>Includes report metadata</li>
                      <li>Ideal for sharing and archiving</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Data */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {previewData ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {previewData.type.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')} Preview
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Showing {previewData.data.data.length} of {previewData.data.total} records
                      {previewData.data.term && ` for ${previewData.data.term}`}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {previewData.data.data.length > 0 &&
                            Object.keys(previewData.data.data[0])
                              .filter(key => !['assigned_students', 'assignments'].includes(key))
                              .map(key => (
                                <th
                                  key={key}
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                >
                                  {key.replace(/_/g, ' ')}
                                </th>
                              ))
                          }
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.data.data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {Object.entries(row)
                              .filter(([key]) => !['assigned_students', 'assignments'].includes(key))
                              .map(([key, value], cellIdx) => (
                                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </td>
                              ))
                            }
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This is a preview. Export the full report to see all data.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportReport(previewData.type, 'csv')}
                        className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                      >
                        Export as CSV
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        onClick={() => exportReport(previewData.type, 'pdf')}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                      >
                        Export as PDF
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No preview data available. Click "Preview" on any report to see sample data.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};