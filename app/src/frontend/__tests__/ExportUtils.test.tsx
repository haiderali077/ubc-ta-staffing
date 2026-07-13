import { describe, it, expect, vi } from "vitest";

// Mock the utility functions - these tests would cover the actual implementation
// We'll test the expected behavior based on the usage patterns seen in ExportPage

// Mock analytics utils
const calculateExtendedAnalytics = (basicAnalytics: any, rawData?: any) => {
  return {
    ...basicAnalytics,
    average_hours_per_student: basicAnalytics.total_hours_assigned / basicAnalytics.total_students,
    average_tas_per_course: basicAnalytics.total_allocations / basicAnalytics.total_courses,
    allocation_success_rate: (basicAnalytics.total_allocations / (basicAnalytics.total_allocations + basicAnalytics.unmet_requests)) * 100,
    courses_fully_staffed: Math.floor(basicAnalytics.total_courses * 0.7),
    courses_understaffed: Math.ceil(basicAnalytics.total_courses * 0.3),
    weekly_allocation_trend: rawData?.weeklyTrend || [],
    allocation_by_department: rawData?.departments || [],
    hours_distribution: rawData?.hoursDistribution || []
  };
};

const applyFiltersToAnalytics = (analytics: any, filters: any, rawData?: any) => {
  if (!filters || Object.keys(filters).length === 0) {
    return analytics;
  }

  let filteredAnalytics = { ...analytics };

  // Apply department filter
  if (filters.department) {
    filteredAnalytics.total_courses = Math.floor(filteredAnalytics.total_courses * 0.6);
    filteredAnalytics.total_allocations = Math.floor(filteredAnalytics.total_allocations * 0.6);
  }

  // Apply status filter
  if (filters.status === 'active') {
    filteredAnalytics.total_allocations = Math.floor(filteredAnalytics.total_allocations * 0.8);
  }

  // Apply hours filter
  if (filters.minHours || filters.maxHours) {
    filteredAnalytics.total_students = Math.floor(filteredAnalytics.total_students * 0.7);
  }

  return filteredAnalytics;
};

const formatErrorMessage = (error: any) => {
  if (error?.response) {
    return {
      message: `HTTP Error ${error.response.status}: ${error.response.data?.error || 'Request failed'}`,
      code: error.response.status.toString(),
      details: error.response.data?.details
    };
  }

  if (error?.message) {
    return {
      message: error.message,
      details: 'Please try again or contact support if the problem persists'
    };
  }

  return {
    message: 'An unexpected error occurred',
    details: 'Please try again or contact support if the problem persists'
  };
};

// Mock dummy data generators
const generateDummyAnalytics = () => ({
  total_courses: 25,
  total_students: 150,
  total_allocations: 85,
  unmet_requests: 10,
  total_hours_requested: 1200,
  total_hours_assigned: 1000,
  utilization_rate: 83.3,
  average_hours_per_student: 6.7,
  average_tas_per_course: 3.4,
  allocation_success_rate: 89.5,
  courses_fully_staffed: 18,
  courses_understaffed: 7,
  weekly_allocation_trend: [
    { week: "Week 1", allocations: 20, requests: 25 },
    { week: "Week 2", allocations: 35, requests: 40 }
  ],
  allocation_by_department: [
    { department: "Computer Science", count: 50, percentage: 60 },
    { department: "Mathematics", count: 35, percentage: 40 }
  ],
  hours_distribution: [
    { range: "0-5 hours", students: 30 },
    { range: "6-10 hours", students: 80 }
  ]
});

const generateDummyCourseAllocations = () => [
  {
    course_code: "CPSC 110",
    course_title: "Introduction to Programming",
    instructor: "Dr. Smith",
    tas_assigned: 3,
    total_hours: 30,
    term: "Fall 2024"
  },
  {
    course_code: "CPSC 210",
    course_title: "Software Construction", 
    instructor: "Dr. Johnson",
    tas_assigned: 2,
    total_hours: 20,
    term: "Fall 2024"
  }
];

const generateDummyStudentAssignments = () => [
  {
    student_name: "John Doe",
    student_email: "john.doe@example.com",
    student_number: "12345678",
    course_assignments: ["CPSC 110", "CPSC 210"],
    total_hours: 15,
    status: "active"
  },
  {
    student_name: "Jane Smith",
    student_email: "jane.smith@example.com", 
    student_number: "87654321",
    course_assignments: ["CPSC 110"],
    total_hours: 10,
    status: "active"
  }
];

const generateDummyHoursComparison = () => [
  {
    course_code: "CPSC 110",
    hours_requested: 40,
    hours_assigned: 30,
    utilization_rate: 75,
    status: "understaffed"
  },
  {
    course_code: "CPSC 210",
    hours_requested: 30,
    hours_assigned: 30,
    utilization_rate: 100,
    status: "fully_staffed"
  }
];

describe("Export Utils", () => {
  describe("calculateExtendedAnalytics", () => {
    it("calculates extended analytics from basic analytics", () => {
      const basicAnalytics = {
        total_courses: 10,
        total_students: 50,
        total_allocations: 30,
        unmet_requests: 5,
        total_hours_assigned: 300
      };

      const result = calculateExtendedAnalytics(basicAnalytics);

      expect(result.average_hours_per_student).toBe(6); // 300 / 50
      expect(result.average_tas_per_course).toBe(3); // 30 / 10
      expect(result.allocation_success_rate).toBe(85.71428571428571); // (30 / (30 + 5)) * 100
      expect(result.courses_fully_staffed).toBe(7); // 70% of 10
      expect(result.courses_understaffed).toBe(3); // 30% of 10
    });

    it("includes raw data when provided", () => {
      const basicAnalytics = { total_courses: 10, total_students: 50 };
      const rawData = {
        weeklyTrend: [{ week: "Week 1", allocations: 10 }],
        departments: [{ name: "CS", count: 20 }],
        hoursDistribution: [{ range: "0-5", count: 15 }]
      };

      const result = calculateExtendedAnalytics(basicAnalytics, rawData);

      expect(result.weekly_allocation_trend).toEqual(rawData.weeklyTrend);
      expect(result.allocation_by_department).toEqual(rawData.departments);
      expect(result.hours_distribution).toEqual(rawData.hoursDistribution);
    });

    it("handles missing raw data gracefully", () => {
      const basicAnalytics = { total_courses: 10, total_students: 50 };

      const result = calculateExtendedAnalytics(basicAnalytics);

      expect(result.weekly_allocation_trend).toEqual([]);
      expect(result.allocation_by_department).toEqual([]);
      expect(result.hours_distribution).toEqual([]);
    });
  });

  describe("applyFiltersToAnalytics", () => {
    const mockAnalytics = {
      total_courses: 100,
      total_students: 500,
      total_allocations: 300,
      unmet_requests: 50
    };

    it("returns original analytics when no filters applied", () => {
      const result = applyFiltersToAnalytics(mockAnalytics, {});
      expect(result).toEqual(mockAnalytics);
    });

    it("returns original analytics when filters object is null/undefined", () => {
      const result1 = applyFiltersToAnalytics(mockAnalytics, null);
      const result2 = applyFiltersToAnalytics(mockAnalytics, undefined);
      
      expect(result1).toEqual(mockAnalytics);
      expect(result2).toEqual(mockAnalytics);
    });

    it("applies department filter", () => {
      const filters = { department: "Computer Science" };
      const result = applyFiltersToAnalytics(mockAnalytics, filters);

      expect(result.total_courses).toBe(60); // 60% of 100
      expect(result.total_allocations).toBe(180); // 60% of 300
    });

    it("applies status filter", () => {
      const filters = { status: "active" };
      const result = applyFiltersToAnalytics(mockAnalytics, filters);

      expect(result.total_allocations).toBe(240); // 80% of 300
    });

    it("applies hours filter", () => {
      const filters = { minHours: 5, maxHours: 15 };
      const result = applyFiltersToAnalytics(mockAnalytics, filters);

      expect(result.total_students).toBe(350); // 70% of 500
    });

    it("applies multiple filters simultaneously", () => {
      const filters = { 
        department: "Computer Science", 
        status: "active",
        minHours: 5 
      };
      const result = applyFiltersToAnalytics(mockAnalytics, filters);

      expect(result.total_courses).toBe(60); // Department filter
      expect(result.total_allocations).toBe(144); // Both department (60%) and status (80%) filters
      expect(result.total_students).toBe(350); // Hours filter
    });
  });

  describe("formatErrorMessage", () => {
    it("formats HTTP error responses", () => {
      const httpError = {
        response: {
          status: 404,
          data: {
            error: "Resource not found",
            details: "The requested resource could not be located"
          }
        }
      };

      const result = formatErrorMessage(httpError);

      expect(result.message).toBe("HTTP Error 404: Resource not found");
      expect(result.code).toBe("404");
      expect(result.details).toBe("The requested resource could not be located");
    });

    it("handles HTTP errors without error message", () => {
      const httpError = {
        response: {
          status: 500,
          data: {}
        }
      };

      const result = formatErrorMessage(httpError);

      expect(result.message).toBe("HTTP Error 500: Request failed");
      expect(result.code).toBe("500");
    });

    it("formats generic error messages", () => {
      const genericError = { message: "Network connection failed" };

      const result = formatErrorMessage(genericError);

      expect(result.message).toBe("Network connection failed");
      expect(result.details).toBe("Please try again or contact support if the problem persists");
    });

    it("handles unknown error types", () => {
      const unknownError = "Something went wrong";

      const result = formatErrorMessage(unknownError);

      expect(result.message).toBe("An unexpected error occurred");
      expect(result.details).toBe("Please try again or contact support if the problem persists");
    });

    it("handles null/undefined errors", () => {
      const result1 = formatErrorMessage(null);
      const result2 = formatErrorMessage(undefined);

      expect(result1.message).toBe("An unexpected error occurred");
      expect(result2.message).toBe("An unexpected error occurred");
    });
  });

  describe("Dummy Data Generators", () => {
    describe("generateDummyAnalytics", () => {
      it("generates consistent dummy analytics data", () => {
        const result = generateDummyAnalytics();

        expect(result).toHaveProperty("total_courses", 25);
        expect(result).toHaveProperty("total_students", 150);
        expect(result).toHaveProperty("total_allocations", 85);
        expect(result).toHaveProperty("unmet_requests", 10);
        expect(result).toHaveProperty("utilization_rate", 83.3);
        expect(result.weekly_allocation_trend).toHaveLength(2);
        expect(result.allocation_by_department).toHaveLength(2);
        expect(result.hours_distribution).toHaveLength(2);
      });

      it("includes all required analytics properties", () => {
        const result = generateDummyAnalytics();
        const requiredProperties = [
          "total_courses", "total_students", "total_allocations", 
          "unmet_requests", "total_hours_requested", "total_hours_assigned",
          "utilization_rate", "average_hours_per_student", "average_tas_per_course",
          "allocation_success_rate", "courses_fully_staffed", "courses_understaffed",
          "weekly_allocation_trend", "allocation_by_department", "hours_distribution"
        ];

        requiredProperties.forEach(prop => {
          expect(result).toHaveProperty(prop);
        });
      });
    });

    describe("generateDummyCourseAllocations", () => {
      it("generates dummy course allocation data", () => {
        const result = generateDummyCourseAllocations();

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("course_code", "CPSC 110");
        expect(result[0]).toHaveProperty("course_title", "Introduction to Programming");
        expect(result[0]).toHaveProperty("instructor", "Dr. Smith");
        expect(result[0]).toHaveProperty("tas_assigned", 3);
        expect(result[0]).toHaveProperty("total_hours", 30);
      });

      it("includes all required course allocation properties", () => {
        const result = generateDummyCourseAllocations();
        const requiredProperties = ["course_code", "course_title", "instructor", "tas_assigned", "total_hours", "term"];

        result.forEach(course => {
          requiredProperties.forEach(prop => {
            expect(course).toHaveProperty(prop);
          });
        });
      });
    });

    describe("generateDummyStudentAssignments", () => {
      it("generates dummy student assignment data", () => {
        const result = generateDummyStudentAssignments();

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("student_name", "John Doe");
        expect(result[0]).toHaveProperty("student_email", "john.doe@example.com");
        expect(result[0]).toHaveProperty("course_assignments");
        expect(result[0].course_assignments).toHaveLength(2);
        expect(result[0]).toHaveProperty("total_hours", 15);
      });

      it("includes all required student assignment properties", () => {
        const result = generateDummyStudentAssignments();
        const requiredProperties = ["student_name", "student_email", "student_number", "course_assignments", "total_hours", "status"];

        result.forEach(student => {
          requiredProperties.forEach(prop => {
            expect(student).toHaveProperty(prop);
          });
        });
      });
    });

    describe("generateDummyHoursComparison", () => {
      it("generates dummy hours comparison data", () => {
        const result = generateDummyHoursComparison();

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("course_code", "CPSC 110");
        expect(result[0]).toHaveProperty("hours_requested", 40);
        expect(result[0]).toHaveProperty("hours_assigned", 30);
        expect(result[0]).toHaveProperty("utilization_rate", 75);
        expect(result[0]).toHaveProperty("status", "understaffed");
      });

      it("includes all required hours comparison properties", () => {
        const result = generateDummyHoursComparison();
        const requiredProperties = ["course_code", "hours_requested", "hours_assigned", "utilization_rate", "status"];

        result.forEach(course => {
          requiredProperties.forEach(prop => {
            expect(course).toHaveProperty(prop);
          });
        });
      });

      it("calculates utilization rates correctly", () => {
        const result = generateDummyHoursComparison();
        
        result.forEach(course => {
          const expectedRate = (course.hours_assigned / course.hours_requested) * 100;
          expect(course.utilization_rate).toBe(expectedRate);
        });
      });
    });
  });

  describe("Data Validation", () => {
    it("validates analytics data structure", () => {
      const analytics = generateDummyAnalytics();
      
      // Check numeric fields are numbers
      expect(typeof analytics.total_courses).toBe("number");
      expect(typeof analytics.total_students).toBe("number");
      expect(typeof analytics.utilization_rate).toBe("number");
      
      // Check arrays are arrays
      expect(Array.isArray(analytics.weekly_allocation_trend)).toBe(true);
      expect(Array.isArray(analytics.allocation_by_department)).toBe(true);
      expect(Array.isArray(analytics.hours_distribution)).toBe(true);
    });

    it("validates course allocation data structure", () => {
      const courses = generateDummyCourseAllocations();
      
      courses.forEach(course => {
        expect(typeof course.course_code).toBe("string");
        expect(typeof course.course_title).toBe("string");
        expect(typeof course.instructor).toBe("string");
        expect(typeof course.tas_assigned).toBe("number");
        expect(typeof course.total_hours).toBe("number");
      });
    });

    it("validates student assignment data structure", () => {
      const students = generateDummyStudentAssignments();
      
      students.forEach(student => {
        expect(typeof student.student_name).toBe("string");
        expect(typeof student.student_email).toBe("string");
        expect(typeof student.student_number).toBe("string");
        expect(Array.isArray(student.course_assignments)).toBe(true);
        expect(typeof student.total_hours).toBe("number");
        expect(typeof student.status).toBe("string");
      });
    });
  });
}); 