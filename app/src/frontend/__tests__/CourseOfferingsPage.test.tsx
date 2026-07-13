import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import CourseOfferingsPage from "../src/pages/ta-coordinator/CourseOfferingsPage";
import { AuthProvider } from "../src/context/AuthContext";

const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Sarah Johnson", email: "coordinator@example.com", role: "ta_coordinator" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};



vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

vi.mock("../src/api/taCoordinatorApi", () => {
  const mockCourses = [
    {
      course_id: 1,
      code: "CPSC 110",
      title: "Computation, Programs, and Programming",
      term: "Fall 2024",
      instructor_id: 1,
      course_days: "Monday, Wednesday, Friday",
      course_time: "10:00 AM - 11:30 AM",
      course_frequency: "weekly",
      lab_sections: [
        {
          lab_section_id: 1,
          section_name: "Lab 1",
          lab_days: "Tuesday, Thursday",
          lab_start_time: "2:00 PM",
          lab_end_time: "3:30 PM",
          ta_name: "John Doe"
        }
      ]
    },
    {
      course_id: 2,
      code: "CPSC 210",
      title: "Software Construction",
      term: "Fall 2024",
      instructor_id: 2,
      course_days: "Monday, Wednesday",
      course_time: "1:30 PM - 3:00 PM",
      course_frequency: "weekly",
      lab_sections: []
    }
  ];

  const mockTerms = [
    { term_id: 1, name: "Fall 2024", status: "active" },
    { term_id: 2, name: "Spring 2025", status: "upcoming" }
  ];

  const mockInstructors = [
    { user_id: 1, name: "Dr. Jane Smith", email: "jane@example.com", role: "instructor" },
    { user_id: 2, name: "Dr. Bob Johnson", email: "bob@example.com", role: "instructor" }
  ];

  return {
    taCoordinatorApi: {
      courses: {
        getAllCourses: vi.fn().mockResolvedValue(mockCourses),
        createCourse: vi.fn().mockResolvedValue({ course_id: 3, code: "CPSC 221", lab_sections: [] }),
        updateCourse: vi.fn().mockResolvedValue({ course_id: 1, code: "CPSC 110", lab_sections: [] }),
        deleteCourse: vi.fn().mockResolvedValue({ success: true }),
      },
      terms: {
        getAllTerms: vi.fn().mockResolvedValue(mockTerms),
      },
      instructors: {
        getAll: vi.fn().mockResolvedValue(mockInstructors),
      },
    },
  };
});

const renderCourseOfferingsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <CourseOfferingsPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("CourseOfferingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      renderCourseOfferingsPage();
      expect(document.body).toBeInTheDocument();
    });

    it("displays the course offerings page title", async () => {
      renderCourseOfferingsPage();
      await waitFor(() => {
        expect(screen.getByText("Course Offerings")).toBeInTheDocument();
      });
    });

    it("displays the add course offering button", async () => {
      renderCourseOfferingsPage();
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });
    });
  });

  describe("Course Table Rendering", () => {
    it("displays courses in the table", async () => {
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("CPSC 110")).toBeInTheDocument();
        expect(screen.getByText("CPSC 210")).toBeInTheDocument();
      });
    });

    it("displays course schedule information", async () => {
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Monday, Wednesday, Friday")).toBeInTheDocument();
        expect(screen.getByText("10:00 AM - 11:30 AM")).toBeInTheDocument();
      });
    });



    it("displays instructor information", async () => {
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getAllByText("Set by Instructor")).toHaveLength(2);
      });
    });
  });

  describe("Course Form Modal", () => {
    it("opens the form modal when add course button is clicked", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument();
      });
    });

    it("displays all required form fields", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      expect(screen.getByPlaceholderText("e.g., Programming I")).toBeInTheDocument();
      expect(screen.getAllByRole("combobox")[0]).toBeInTheDocument();
      expect(screen.getByText("Course Frequency *")).toBeInTheDocument();
    });

    it("displays day of week checkboxes", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("Tuesday")).toBeInTheDocument();
        expect(screen.getByText("Wednesday")).toBeInTheDocument();
        expect(screen.getByText("Thursday")).toBeInTheDocument();
        expect(screen.getByText("Friday")).toBeInTheDocument();
      });
    });

    it("displays time dropdown options", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByText("Start Time *")).toBeInTheDocument();
        expect(screen.getByText("End Time *")).toBeInTheDocument();
      });
    });

    it("displays frequency dropdown options", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByText("Course Frequency *")).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Weekly" })).toBeInTheDocument();
      });
    });
  });

  describe("Lab Sections Management", () => {
    it("displays lab sections section in the form", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getAllByText("Lab Sections")).toHaveLength(2);
        expect(screen.getByText("Add Lab Section")).toBeInTheDocument();
      });
    });

    it("adds a lab section when add lab section button is clicked", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByText("Add Lab Section")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Lab Section"));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue("Lab 1")).toBeInTheDocument();
        expect(screen.getAllByPlaceholderText("e.g., Lab 1, Lab A")).toHaveLength(1);
      });
    });

    it("allows multiple lab sections to be added", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      await user.click(screen.getByText("Add Lab Section"));
      await user.click(screen.getByText("Add Lab Section"));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue("Lab 1")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Lab 2")).toBeInTheDocument();
      });
    });

    it("allows lab sections to be removed", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      
      // Add a lab section
      await user.click(screen.getByText("Add Lab Section"));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue("Lab 1")).toBeInTheDocument();
        expect(screen.getAllByText("Remove")).toHaveLength(1);
      });
      
      // Remove the lab section
      await user.click(screen.getAllByText("Remove")[0]);
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Lab 1")).not.toBeInTheDocument();
        expect(screen.queryAllByText("Remove")).toHaveLength(0);
      });
    });

    it("displays lab section form fields", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      
      // Add a lab section
      await user.click(screen.getByText("Add Lab Section"));
      
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText("e.g., Lab 1, Lab A")).toHaveLength(1);
        expect(screen.getByText("Lab Days *")).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("shows error when trying to submit without required course fields", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getByText("Add Course Offering")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Add Course Offering"));
      await user.click(screen.getByText("Create"));
      
      // The form should not submit without required fields
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      expect(taCoordinatorApi.courses.createCourse).not.toHaveBeenCalled();
    });

    it("shows error when no days are selected", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      await user.type(screen.getByPlaceholderText("e.g., COSC 111"), "CPSC 221");
      await user.type(screen.getByPlaceholderText("e.g., Programming I"), "Test Course");
      // Select the term dropdown
      const termSelect = screen.getByDisplayValue("Select Term");
      await user.selectOptions(termSelect, "Fall 2024");
      await user.click(screen.getByText("Create"));
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      expect(taCoordinatorApi.courses.createCourse).not.toHaveBeenCalled();
    });

    it("shows error when start and end times are not selected", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      await user.type(screen.getByPlaceholderText("e.g., COSC 111"), "CPSC 221");
      await user.type(screen.getByPlaceholderText("e.g., Programming I"), "Test Course");
      // Select the term dropdown
      const termSelect = screen.getByDisplayValue("Select Term");
      await user.selectOptions(termSelect, "Fall 2024");
      // Select a day
      await user.click(screen.getByRole("checkbox", { name: "Monday" }));
      await user.click(screen.getByText("Create"));
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      expect(taCoordinatorApi.courses.createCourse).not.toHaveBeenCalled();
    });

    it("shows error when course frequency is not selected", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      
      // Wait for the form to be fully rendered
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      
      // Fill in course info but no frequency
      await user.type(screen.getByPlaceholderText("e.g., COSC 111"), "CPSC 221");
      await user.type(screen.getByPlaceholderText("e.g., Programming I"), "Test Course");
      // Select the term dropdown
      const termSelect = screen.getByDisplayValue("Select Term");
      await user.selectOptions(termSelect, "Fall 2024");
      
      // Select a day
      const mondayCheckbox = screen.getByRole("checkbox", { name: "Monday" });
      await user.click(mondayCheckbox);
      
      // Select times (no explicit frequency selection, defaults to Weekly)
      {
        const startTimeSelect = screen.getByDisplayValue("Select Start Time");
        const endTimeSelect = screen.getByDisplayValue("Select End Time");
        await user.selectOptions(startTimeSelect, "8:00 AM");
        await user.selectOptions(endTimeSelect, "9:30 AM");
      }
      
      await user.click(screen.getByText("Create"));
      
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      expect(taCoordinatorApi.courses.createCourse).not.toHaveBeenCalled();
    });

    it("shows error when end time is before start time", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      
      // Wait for the form to be fully rendered
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      
      // Fill in course info with invalid time range
      await user.type(screen.getByPlaceholderText("e.g., COSC 111"), "CPSC 221");
      await user.type(screen.getByPlaceholderText("e.g., Programming I"), "Test Course");
      // Select the term dropdown
      const termSelect = screen.getByDisplayValue("Select Term");
      await user.selectOptions(termSelect, "Fall 2024");
      
      // Select a day and invalid time range
      const mondayCheckbox = screen.getByRole("checkbox", { name: "Monday" });
      await user.click(mondayCheckbox);
      {
        const startTimeSelect = screen.getByDisplayValue("Select Start Time");
        const endTimeSelect = screen.getByDisplayValue("Select End Time");
        await user.selectOptions(startTimeSelect, "10:00 AM");
        await user.selectOptions(endTimeSelect, "8:00 AM");
      }
      
      await user.click(screen.getByText("Create"));
      
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      expect(taCoordinatorApi.courses.createCourse).not.toHaveBeenCalled();
    });
  });

  describe("Course CRUD Operations", () => {
    it("creates a course successfully", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      
      // Wait for the form to be fully rendered
      await waitFor(() => expect(screen.getByPlaceholderText("e.g., COSC 111")).toBeInTheDocument());
      
      // Fill in all required fields
      await user.type(screen.getByPlaceholderText("e.g., COSC 111"), "CPSC 221");
      await user.type(screen.getByPlaceholderText("e.g., Programming I"), "Test Course");
      // Select the term dropdown
      const termSelect = screen.getByDisplayValue("Select Term");
      await user.selectOptions(termSelect, "Fall 2024");
      
      // Select a day
      const mondayCheckbox = screen.getByRole("checkbox", { name: "Monday" });
      await user.click(mondayCheckbox);
      
      // Select times and frequency
      {
        const startTimeSelect = screen.getByDisplayValue("Select Start Time");
        const endTimeSelect = screen.getByDisplayValue("Select End Time");
        await user.selectOptions(startTimeSelect, "8:00 AM");
        await user.selectOptions(endTimeSelect, "9:30 AM");
      }
      {
        const frequencySelect = screen.getByDisplayValue("Select Frequency");
        await user.selectOptions(frequencySelect, "weekly");
      }
      
      await user.click(screen.getByText("Create"));
      
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      await waitFor(() => {
        expect(taCoordinatorApi.courses.createCourse).toHaveBeenCalledWith({
          code: "CPSC 221",
          title: "Test Course",
          term: "Fall 2024",
          instructor_id: undefined,
          course_days: "Monday",
          course_time: "8:00 AM - 9:30 AM",
          course_frequency: "weekly",
          lab_sections: []
        });
      });
    });

    it("opens edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getAllByText("Edit")).toHaveLength(2); // Should have edit buttons for both courses
      });

      await user.click(screen.getAllByText("Edit")[0]);
      
      await waitFor(() => {
        expect(screen.getByText("Edit Course Offering")).toBeInTheDocument();
      });
    });

    it("deletes a course when delete button is clicked", async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        expect(screen.getAllByText("Delete")).toHaveLength(2);
      });

      await user.click(screen.getAllByText("Delete")[0]);
      
      const { taCoordinatorApi } = await import("../src/api/taCoordinatorApi");
      await waitFor(() => {
        expect(taCoordinatorApi.courses.deleteCourse).toHaveBeenCalledWith(1);
      });

      confirmSpy.mockRestore();
    });
  });

  describe("Responsive Table", () => {
    it("renders table with proper structure", async () => {
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        const table = screen.getByRole("table");
        expect(table).toBeInTheDocument();
        
        // Check for header columns
        expect(screen.getByText("Course")).toBeInTheDocument();
        expect(screen.getByText("Term")).toBeInTheDocument();
        expect(screen.getByText("Instructor")).toBeInTheDocument();
        expect(screen.getByText("Schedule")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
      });
    });

    it("displays course information in table cells", async () => {
      renderCourseOfferingsPage();
      
      await waitFor(() => {
        // Check course code and title
        expect(screen.getByText("CPSC 110")).toBeInTheDocument();
        expect(screen.getByText("Computation, Programs, and Programming")).toBeInTheDocument();
        
        // Check schedule information
        expect(screen.getByText("Monday, Wednesday, Friday")).toBeInTheDocument();
        expect(screen.getByText("10:00 AM - 11:30 AM")).toBeInTheDocument();
        
        // Check instructor information
        expect(screen.getAllByText("Set by Instructor")).toHaveLength(2);
      });
    });
  });

  describe("Modal State Management", () => {
    it("closes modal when cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));
      
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Add New Course Offering" })).not.toBeInTheDocument();
      });
    });

    it("resets form state when modal is closed", async () => {
      const user = userEvent.setup();
      renderCourseOfferingsPage();
      
      // Open modal and add lab section
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => expect(screen.getByRole("heading", { name: "Add New Course Offering" })).toBeInTheDocument());
      await user.click(screen.getByText("Add Lab Section"));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue("Lab 1")).toBeInTheDocument();
      });

      // Close modal
      await user.click(screen.getByText("Cancel"));
      
      // Reopen modal - should be clean state
      await waitFor(() => expect(screen.getByText("Add Course Offering")).toBeInTheDocument());
      await user.click(screen.getByText("Add Course Offering"));
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Lab 1")).not.toBeInTheDocument();
      });
    });
  });
});
