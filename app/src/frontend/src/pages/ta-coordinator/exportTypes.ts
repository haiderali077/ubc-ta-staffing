// exportTypes.ts
// import type { LucideIcon } from 'lucide-react';

export interface Analytics {
  total_courses: number;
  total_students: number;
  total_allocations: number;
  unmet_requests: number;
  total_hours_requested: number;
  total_hours_assigned: number;
  utilization_rate: number;
}

export interface ExtendedAnalytics extends Analytics {
  average_hours_per_student: number;
  average_tas_per_course: number;
  allocation_success_rate: number;
  courses_fully_staffed: number;
  courses_understaffed: number;
  weekly_allocation_trend: Array<{
    week: string;
    allocations: number;
    requests: number;
  }>;
  allocation_by_department: Array<{
    department: string;
    count: number;
    percentage: number;
  }>;
  hours_distribution: Array<{
    range: string;
    students: number;
  }>;
}

export interface PreviewData {
  type: string;
  data: {
    data: unknown[];
    total: number;
    preview: boolean;
    term: string;
  };
}

export interface Filters {
  department?: string;
  dateRange?: { start: Date; end: Date };
  minHours?: number;
  maxHours?: number;
  status?: string;
  term?: string;
}

export interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: number;
}

export interface ExportButtonProps {
  reportType: string;
  title: string;
  description: string;
  icon: any;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
}

// Chart colors
export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Dummy data for when toggle is on
export interface DummyDataGenerators {
  generateDummyAnalytics: () => ExtendedAnalytics;
  generateDummyCourseAllocations: () => unknown[];
  generateDummyStudentAssignments: () => unknown[];
  generateDummyHoursComparison: () => unknown[];
}