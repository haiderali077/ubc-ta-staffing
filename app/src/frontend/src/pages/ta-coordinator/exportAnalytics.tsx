// exportAnalytics.tsx
import React from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  BookOpen,
  Activity,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import type {
  ExtendedAnalytics,
  AnalyticsCardProps,
  Filters
} from './exportTypes';
import { CHART_COLORS } from './exportTypes';

interface AnalyticsDashboardProps {
  analytics: ExtendedAnalytics | null;
  loading: boolean;
  onRefresh: () => void;
  filters: Filters;
  previousAnalytics?: ExtendedAnalytics | null;
  useDummyData?: boolean;
}

const AnalyticsCard: React.FC<AnalyticsCardProps & { previousValue?: number }> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  previousValue 
}) => {
  // Calculate trend from previous value if available
  let calculatedTrend = trend;
  if (previousValue !== undefined && typeof value === 'number') {
    const currentVal = typeof value === 'string' && value.includes('%') 
      ? parseFloat(value) 
      : Number(value);
    
    if (previousValue !== 0) {
      calculatedTrend = Number((((currentVal - previousValue) / previousValue) * 100).toFixed(1));
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase">{title}</p>
          <p className="text-3xl font-bold mt-2 dark:text-gray-100" style={{ color }}>{value}</p>
          {calculatedTrend !== undefined && (
            <p className={`text-sm mt-2 flex items-center ${calculatedTrend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${calculatedTrend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(calculatedTrend)}% from last term
            </p>
          )}
        </div>
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  loading,
  onRefresh,
  filters,
  previousAnalytics,
  useDummyData = false
}) => {
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg">
        <p>No analytics data available. Please check your filters or try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Courses"
          value={analytics.total_courses}
          icon={Calendar}
          color="#3B82F6"
          trend={useDummyData ? 12 : undefined}
          previousValue={previousAnalytics?.total_courses}
        />
        <AnalyticsCard
          title="Total Students"
          value={analytics.total_students}
          icon={Users}
          color="#10B981"
          trend={useDummyData ? 8 : undefined}
          previousValue={previousAnalytics?.total_students}
        />
        <AnalyticsCard
          title="Total Allocations"
          value={analytics.total_allocations}
          icon={BarChart3}
          color="#F59E0B"
          trend={useDummyData ? -5 : undefined}
          previousValue={previousAnalytics?.total_allocations}
        />
        <AnalyticsCard
          title="Unmet Requests"
          value={analytics.unmet_requests}
          icon={AlertCircle}
          color="#EF4444"
          trend={useDummyData ? -15 : undefined}
          previousValue={previousAnalytics?.unmet_requests}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnalyticsCard
          title="Avg Hours/Student"
          value={analytics.average_hours_per_student.toFixed(1)}
          icon={Clock}
          color="#8B5CF6"
        />
        <AnalyticsCard
          title="Avg TAs/Course"
          value={analytics.average_tas_per_course.toFixed(1)}
          icon={BookOpen}
          color="#EC4899"
        />
        <AnalyticsCard
          title="Success Rate"
          value={`${analytics.allocation_success_rate}%`}
          icon={TrendingUp}
          color="#059669"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Allocation Trend</h3>
          {analytics.weekly_allocation_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.weekly_allocation_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="#FEF3C7"
                  name="Requests"
                />
                <Area
                  type="monotone"
                  dataKey="allocations"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#DBEAFE"
                  name="Allocations"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Allocation by Department</h3>
          {analytics.allocation_by_department.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={analytics.allocation_by_department}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.department}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.allocation_by_department.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No department data available
            </div>
          )}
        </div>
      </div>

      {/* Hours Summary */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Hours Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {analytics.total_hours_requested}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hours Requested</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {analytics.total_hours_assigned}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hours Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {analytics.utilization_rate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Utilization Rate</div>
          </div>
        </div>

        {/* Hours Distribution Bar Chart */}
        {analytics.hours_distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.hours_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="students" fill="#3B82F6" name="Students" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No hours distribution data available
          </div>
        )}
      </div>

      {/* Course Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Fully Staffed Courses</h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {analytics.courses_fully_staffed}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">All TA positions filled</p>
            </div>
            <Activity className="h-12 w-12 text-green-500 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Understaffed Courses</h3>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {analytics.courses_understaffed}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Need additional TAs</p>
            </div>
            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Export Analytics Data */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Export Analytics Data</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Download this analytics report in various formats</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportAnalyticsData(analytics, 'json')}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              JSON
            </button>
            <button
              onClick={() => exportAnalyticsData(analytics, 'csv')}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to export analytics data
const exportAnalyticsData = (analytics: ExtendedAnalytics, format: 'json' | 'csv') => {
  const filename = `analytics_report_${new Date().toISOString().split('T')[0]}`;

  if (format === 'json') {
    const dataStr = JSON.stringify(analytics, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'csv') {
    // Convert analytics to CSV format
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Courses', analytics.total_courses],
      ['Total Students', analytics.total_students],
      ['Total Allocations', analytics.total_allocations],
      ['Unmet Requests', analytics.unmet_requests],
      ['Hours Requested', analytics.total_hours_requested],
      ['Hours Assigned', analytics.total_hours_assigned],
      ['Utilization Rate', analytics.utilization_rate + '%'],
      ['Avg Hours/Student', analytics.average_hours_per_student],
      ['Avg TAs/Course', analytics.average_tas_per_course],
      ['Success Rate', analytics.allocation_success_rate + '%'],
      ['Fully Staffed Courses', analytics.courses_fully_staffed],
      ['Understaffed Courses', analytics.courses_understaffed]
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};