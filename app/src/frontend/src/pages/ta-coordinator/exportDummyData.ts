// exportDummyData.ts
import type { ExtendedAnalytics } from './exportTypes';

// Generate dummy analytics data with calculated values
export const generateDummyAnalytics = (): ExtendedAnalytics => {
  // Generate random base values for more realistic data
  const total_courses = 20 + Math.floor(Math.random() * 10);
  const total_students = 120 + Math.floor(Math.random() * 60);
  const total_allocations = 60 + Math.floor(Math.random() * 30);
  const unmet_requests = 5 + Math.floor(Math.random() * 10);
  const total_hours_requested = 700 + Math.floor(Math.random() * 200);
  const total_hours_assigned = Math.floor(total_hours_requested * (0.7 + Math.random() * 0.2));
  
  // Calculate derived values
  const utilization_rate = Number(((total_hours_assigned / total_hours_requested) * 100).toFixed(1));
  const average_hours_per_student = Number((total_hours_assigned / total_students).toFixed(1));
  const average_tas_per_course = Number((total_allocations / total_courses).toFixed(1));
  const allocation_success_rate = Number(((total_allocations / (total_allocations + unmet_requests)) * 100).toFixed(1));
  const courses_fully_staffed = Math.floor(total_courses * (allocation_success_rate / 100));
  const courses_understaffed = total_courses - courses_fully_staffed;

  // Generate dynamic weekly trend
  const baseAlloc = 10 + Math.floor(Math.random() * 5);
  const weekly_allocation_trend = [
    { week: 'Week 1', allocations: baseAlloc, requests: baseAlloc + 3 },
    { week: 'Week 2', allocations: baseAlloc + 6, requests: baseAlloc + 8 },
    { week: 'Week 3', allocations: baseAlloc + 13, requests: baseAlloc + 16 },
    { week: 'Week 4', allocations: baseAlloc + 8, requests: baseAlloc + 13 }
  ];

  // Generate dynamic department distribution
  const csPercentage = 50 + Math.floor(Math.random() * 20);
  const mathPercentage = 20 + Math.floor(Math.random() * 15);
  const dataPercentage = 100 - csPercentage - mathPercentage;
  
  const allocation_by_department = [
    { 
      department: 'Computer Science', 
      count: Math.floor(total_allocations * csPercentage / 100), 
      percentage: csPercentage 
    },
    { 
      department: 'Mathematics', 
      count: Math.floor(total_allocations * mathPercentage / 100), 
      percentage: mathPercentage 
    },
    { 
      department: 'Data Science', 
      count: Math.floor(total_allocations * dataPercentage / 100), 
      percentage: dataPercentage 
    }
  ];

  // Generate dynamic hours distribution
  const dist = [0.2, 0.43, 0.27, 0.1].map(p => Math.floor(total_students * p));
  const hours_distribution = [
    { range: '0-5 hours', students: dist[0] },
    { range: '6-10 hours', students: dist[1] },
    { range: '11-15 hours', students: dist[2] },
    { range: '16-20 hours', students: dist[3] }
  ];

  return {
    total_courses,
    total_students,
    total_allocations,
    unmet_requests,
    total_hours_requested,
    total_hours_assigned,
    utilization_rate,
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

export const generateDummyCourseAllocations = () => {
  const courses = ['COSC 101', 'COSC 111', 'COSC 121', 'COSC 211', 'COSC 221', 'COSC 222', 'COSC 310', 'COSC 320', 'COSC 341', 'COSC 421'];
  const instructors = ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Davis'];
  const terms = ['2025W1', '2025W2', '2024W1', '2024W2'];
  
  return courses.map((course, idx) => {
    const total_ta_slots = Math.floor(Math.random() * 5) + 2;
    const filled_slots = Math.min(total_ta_slots, Math.floor(Math.random() * total_ta_slots) + 1);
    const hours_per_ta = 10;
    
    return {
      course_id: idx + 1,
      course_code: course,
      course_title: `${course.replace('COSC', 'Computer Science')} - Introduction`,
      term: terms[idx % terms.length],
      instructor_name: instructors[idx % instructors.length],
      total_ta_slots,
      filled_slots,
      remaining_slots: total_ta_slots - filled_slots,
      hours_requested: total_ta_slots * hours_per_ta,
      hours_assigned: filled_slots * hours_per_ta,
      utilization_rate: Number(((filled_slots / total_ta_slots) * 100).toFixed(1))
    };
  });
};

export const generateDummyStudentAssignments = () => {
  const students = [];
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Amy'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
  const majors = ['Computer Science', 'Mathematics', 'Data Science', 'Engineering'];
  const courses = ['COSC 101', 'COSC 111', 'COSC 121', 'COSC 211', 'COSC 221'];
  
  for (let i = 0; i < 20; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const total_assignments = Math.floor(Math.random() * 3) + 1;
    const hours_per_assignment = [5, 10, 15][Math.floor(Math.random() * 3)];
    
    students.push({
      user_id: i + 1,
      student_name: `${firstName} ${lastName}`,
      student_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.ubc.ca`,
      student_number: `2023${String(i + 1000).padStart(4, '0')}`,
      major: majors[Math.floor(Math.random() * majors.length)],
      total_assignments,
      total_hours: total_assignments * hours_per_assignment,
      assignments: Array.from({ length: total_assignments }, (_, idx) => ({
        course_code: courses[Math.floor(Math.random() * courses.length)],
        course_title: 'Introduction to Computer Science',
        term: '2025W1',
        allocated_at: new Date(2025, 0, Math.floor(Math.random() * 28) + 1).toISOString(),
        status: 'active',
        hours: hours_per_assignment
      }))
    });
  }
  
  return students;
};

export const generateDummyHoursComparison = () => {
  const courses = [
    'COSC 101', 'COSC 111', 'COSC 121', 'COSC 211', 'COSC 221',
    'COSC 222', 'COSC 310', 'COSC 320', 'COSC 341', 'COSC 421'
  ];
  const instructors = ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Davis'];
  const terms = ['2025W1', '2025W2', '2024W1', '2024W2'];
  
  return courses.map((course, idx) => {
    const ta_slots_requested = Math.floor(Math.random() * 5) + 2;
    const ta_slots_filled = Math.min(ta_slots_requested, Math.floor(Math.random() * ta_slots_requested) + 1);
    const hours_per_slot = 10;
    const hours_requested = ta_slots_requested * hours_per_slot;
    const hours_assigned = ta_slots_filled * hours_per_slot;
    
    return {
      course_code: course,
      course_title: `${course.replace('COSC', 'Computer Science')} - Introduction`,
      term: terms[idx % terms.length],
      instructor_name: instructors[idx % instructors.length],
      hours_requested,
      hours_assigned,
      ta_slots_requested,
      ta_slots_filled,
      utilization_rate: Number(((hours_assigned / hours_requested) * 100).toFixed(1)),
      variance: hours_requested - hours_assigned,
      status: ta_slots_filled === ta_slots_requested ? 'Fully Staffed' : 'Understaffed'
    };
  });
};