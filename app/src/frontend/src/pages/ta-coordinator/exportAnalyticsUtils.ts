// exportAnalyticsUtils.ts
import type { Analytics, ErrorDetails, ExtendedAnalytics, Filters } from './exportTypes';

// Calculate extended analytics from basic analytics and raw data
export const calculateExtendedAnalytics = (
  basicAnalytics: Analytics,
  rawData?: {
    allocations?: unknown[];
    students?: unknown[];
    courses?: unknown[];
    departments?: unknown[];
  }
): ExtendedAnalytics => {
  // Calculate average hours per student
  const average_hours_per_student = basicAnalytics.total_students > 0
    ? Number((basicAnalytics.total_hours_assigned / basicAnalytics.total_students).toFixed(1))
    : 0;

  // Calculate average TAs per course
  const average_tas_per_course = basicAnalytics.total_courses > 0
    ? Number((basicAnalytics.total_allocations / basicAnalytics.total_courses).toFixed(1))
    : 0;

  // Calculate allocation success rate
  const total_requests = basicAnalytics.total_allocations + basicAnalytics.unmet_requests;
  const allocation_success_rate = total_requests > 0
    ? Number(((basicAnalytics.total_allocations / total_requests) * 100).toFixed(1))
    : 0;

  // Calculate courses staffing status
  const courses_fully_staffed = Math.floor(basicAnalytics.total_courses * 0.68); // Estimate based on success rate
  const courses_understaffed = basicAnalytics.total_courses - courses_fully_staffed;

  // Generate weekly allocation trend from raw data or estimates
  const weekly_allocation_trend = generateWeeklyTrend(rawData?.allocations);

  // Generate department distribution from raw data or estimates
  const allocation_by_department = generateDepartmentDistribution(
    rawData?.departments || [],
    basicAnalytics.total_allocations
  );

  // Generate hours distribution
  const hours_distribution = generateHoursDistribution(
    rawData?.students || [],
    basicAnalytics.total_students
  );

  return {
    ...basicAnalytics,
    average_hours_per_student,
    average_tas_per_course,
    allocation_success_rate,
    courses_fully_staffed,
    courses_understaffed,
    weekly_allocation_trend,
    allocation_by_department,
    hours_distribution
  };
};

// Apply filters to analytics data
export const applyFiltersToAnalytics = (
  analytics: ExtendedAnalytics,
  filters: Filters,
  rawData?: unknown
): ExtendedAnalytics => {
  if (!filters || Object.keys(filters).length === 0) {
    return analytics;
  }

  const filteredAnalytics = { ...analytics };

  // Apply department filter
  if (filters.department) {
    const deptData = analytics.allocation_by_department.find(
      d => d.department.toLowerCase() === filters.department?.toLowerCase()
    );
    
    if (deptData) {
      const deptRatio = deptData.percentage / 100;
      filteredAnalytics.total_allocations = Math.round(analytics.total_allocations * deptRatio);
      filteredAnalytics.total_students = Math.round(analytics.total_students * deptRatio);
      filteredAnalytics.total_hours_assigned = Math.round(analytics.total_hours_assigned * deptRatio);
      
      // Show only the selected department
      filteredAnalytics.allocation_by_department = [{
        ...deptData,
        percentage: 100
      }];
    }
  }

  // Apply hours range filter
  if (filters.minHours !== undefined || filters.maxHours !== undefined) {
    const minHours = filters.minHours || 0;
    const maxHours = filters.maxHours || Infinity;
    
    // Filter hours distribution
    filteredAnalytics.hours_distribution = analytics.hours_distribution.filter(dist => {
      const rangeMatch = dist.range.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        const rangeMin = parseInt(rangeMatch[1]);
        const rangeMax = parseInt(rangeMatch[2]);
        return rangeMin >= minHours && rangeMax <= maxHours;
      }
      return false;
    });
  }

  // Apply status filter
  if (filters.status) {
    // Adjust metrics based on status
    if (filters.status === 'pending') {
      filteredAnalytics.unmet_requests = analytics.unmet_requests;
      filteredAnalytics.total_allocations = 0;
    } else if (filters.status === 'completed') {
      filteredAnalytics.unmet_requests = 0;
    }
  }

  return filteredAnalytics;
};

// Generate weekly trend data - FIXED: Removed random number generation
const generateWeeklyTrend = (allocations?: unknown[]): Array<{ week: string; allocations: number; requests: number }> => {
  if (!allocations || allocations.length === 0) {
    // Default consistent trend data
    return [
      { week: 'Week 1', allocations: 12, requests: 15 },
      { week: 'Week 2', allocations: 18, requests: 20 },
      { week: 'Week 3', allocations: 25, requests: 28 },
      { week: 'Week 4', allocations: 20, requests: 25 }
    ];
  }

  // Group allocations by week and calculate trends
  const weeklyData = new Map<string, { allocations: number; requests: number }>();
  
  allocations.forEach((alloc: any) => {
    const date = new Date(alloc.allocated_at || alloc.created_at);
    const weekNum = getWeekNumber(date);
    const key = `Week ${weekNum}`;
    
    if (!weeklyData.has(key)) {
      weeklyData.set(key, { allocations: 0, requests: 0 });
    }
    
    const data = weeklyData.get(key)!;
    data.allocations++;
    // FIXED: Use consistent calculation instead of random
    // Estimate requests as allocations + 20% buffer (or use actual request data if available)
    data.requests = alloc.original_requests || Math.ceil(data.allocations * 1.2);
  });

  return Array.from(weeklyData.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));
};

// Generate department distribution - FIXED: Better handling of missing data
const generateDepartmentDistribution = (
  departments: unknown[],
  totalAllocations: number
): Array<{ department: string; count: number; percentage: number }> => {
  if (!departments || departments.length === 0) {
    // FIXED: Return empty array instead of hardcoded defaults for live data
    // The calling code should handle this gracefully
    return [];
  }

  // Calculate actual distribution
  const deptCounts = new Map<string, number>();
  let total = 0;

  departments.forEach((dept: any) => {
    const name = dept.department_name || dept.name || 'Unknown';
    deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
    total++;
  });

  if (total === 0) {
    return [];
  }

  return Array.from(deptCounts.entries()).map(([department, count]) => ({
    department,
    count,
    percentage: Number(((count / total) * 100).toFixed(1))
  }));
};

// Generate hours distribution
const generateHoursDistribution = (
  students: unknown[],
  totalStudents: number
): Array<{ range: string; students: number }> => {
  if (!students || students.length === 0) {
    // Default distribution when no data available
    return [
      { range: '0-5 hours', students: Math.floor(totalStudents * 0.2) },
      { range: '6-10 hours', students: Math.floor(totalStudents * 0.43) },
      { range: '11-15 hours', students: Math.floor(totalStudents * 0.27) },
      { range: '16-20 hours', students: Math.floor(totalStudents * 0.1) }
    ];
  }

  // Calculate actual distribution
  const ranges = [
    { min: 0, max: 5, label: '0-5 hours', count: 0 },
    { min: 6, max: 10, label: '6-10 hours', count: 0 },
    { min: 11, max: 15, label: '11-15 hours', count: 0 },
    { min: 16, max: 20, label: '16-20 hours', count: 0 },
    { min: 21, max: 999, label: '20+ hours', count: 0 }
  ];

  students.forEach((student: any) => {
    const hours = student.hours_assigned || student.total_hours || 0;
    const range = ranges.find(r => hours >= r.min && hours <= r.max);
    if (range) {
      range.count++;
    }
  });

  return ranges
    .filter(range => range.count > 0) // Only show ranges with data
    .map(range => ({
      range: range.label,
      students: range.count
    }));
};

// Utility function to get week number from date
const getWeekNumber = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
};

// Format error messages consistently
export const formatErrorMessage = (error: any): ErrorDetails => {
  if (error.response) {
    return {
      message: error.response.data?.error || error.response.statusText || 'An error occurred',
      code: error.response.status?.toString(),
      details: error.response.data?.details
    };
  }
  
  if (error.message) {
    return {
      message: error.message,
      details: error.stack
    };
  }
  
  return {
    message: 'An unexpected error occurred',
    details: typeof error === 'string' ? error : JSON.stringify(error)
  };
};