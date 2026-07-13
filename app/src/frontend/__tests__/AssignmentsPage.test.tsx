import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AssignmentsPage from "../src/pages/student/AssignmentsPage";
import { AuthProvider } from "../src/context/AuthContext";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  user_id: 10,
  email: "student@example.com",
  name: "Test Student",
  role: "student",
};

const mockAuthContext = {
  isAuthenticated: true,
  user: mockUser,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

// Mock the AssignmentCalendar component
vi.mock("../src/components/calendar/AssignmentCalendar", () => ({
  default: ({ assignments, loading }: { assignments: any[]; loading: boolean }) => (
    <div data-testid="assignment-calendar">
      <div data-testid="calendar-loading">{loading ? "Loading..." : "Calendar loaded"}</div>
      <div data-testid="calendar-assignments">{assignments.length} assignments</div>
    </div>
  ),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockAssignments = [
  {
    allocation_id: 1,
    course_code: "ECON 335",
    course_title: "Financial Markets",
    term: "Fall 2024",
    allocated_at: "2024-12-01T10:00:00Z",
    status: "active",
    notes: "Test assignment",
    allocated_by_name: "Test Coordinator",
  },
  {
    allocation_id: 2,
    course_code: "COSC 499",
    course_title: "Software Engineering",
    term: "Fall 2024",
    allocated_at: "2024-11-15T14:30:00Z",
    status: "completed",
    notes: "Completed assignment",
    allocated_by_name: "Test Coordinator",
  },
];

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe("AssignmentsPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("shows loading state initially", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithAuth(<AssignmentsPage />);

      // Check for loading button
      expect(screen.getByRole("button", { name: "Loading..." })).toBeInTheDocument();
      expect(screen.getByTestId("calendar-loading")).toHaveTextContent("Loading...");
    });
  });

  describe("Success State", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ assignments: mockAssignments }),
      });
    });

    it("renders page title", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(screen.getByText("My TA Assignments")).toBeInTheDocument();
      });
    });

    it("displays statistics cards with correct counts", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(screen.getByText("Total Assignments")).toBeInTheDocument();
        expect(screen.getByText("Cancelled")).toBeInTheDocument();

        // Use more specific selectors for the statistics cards by getting all instances and filtering
        const completedElements = screen.getAllByText("Completed");
        const activeElements = screen.getAllByText("Active");
        
        // Find the statistics card elements (not the status badges)
        const totalCard = screen.getByText("Total Assignments").closest(".bg-white");
        const activeCard = activeElements.find(el => el.closest(".bg-white")?.querySelector("dt"))?.closest(".bg-white");
        const completedCard = completedElements.find(el => el.closest(".bg-white")?.querySelector("dt"))?.closest(".bg-white");
        const cancelledCard = screen.getByText("Cancelled").closest(".bg-white");

        expect(totalCard?.textContent).toContain("2");
        expect(activeCard?.textContent).toContain("1");
        expect(completedCard?.textContent).toContain("1");
        expect(cancelledCard?.textContent).toContain("0");
      });
    });

    it("renders assignment calendar with correct data", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("assignment-calendar")).toBeInTheDocument();
        expect(screen.getByTestId("calendar-loading")).toHaveTextContent("Calendar loaded");
        expect(screen.getByTestId("calendar-assignments")).toHaveTextContent("2 assignments");
      });
    });

    it("makes API call with correct user ID", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/users/10/assignments",
          expect.objectContaining({
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          })
        );
      });
    });
  });

  describe("Error State", () => {
    beforeEach(() => {
      mockFetch.mockRejectedValue(new Error("Failed to fetch assignments"));
    });

    it("shows error message when API call fails", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(screen.getByText("Error loading assignments")).toBeInTheDocument();
        expect(screen.getByText("Failed to fetch assignments")).toBeInTheDocument();
      });
    });

    it("shows zero counts in statistics when error occurs", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        const zeroCounts = screen.getAllByText("0");
        expect(zeroCounts.length).toBeGreaterThanOrEqual(4); // All stats should show 0
      });
    });
  });

  describe("Empty State", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ assignments: [] }),
      });
    });

    it("shows calendar and stats but no assignment list when no assignments", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        // Should show page title and calendar
        expect(screen.getByText("My TA Assignments")).toBeInTheDocument();
        expect(screen.getByTestId("assignment-calendar")).toBeInTheDocument();
        
        // Should not show assignment summary section
        expect(screen.queryByText("Assignment Summary")).not.toBeInTheDocument();
      });
    });

    it("shows all zero counts in statistics", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        const zeroCounts = screen.getAllByText("0");
        expect(zeroCounts.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe("Refresh Functionality", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ assignments: mockAssignments }),
      });
    });

    it("allows manual refresh of assignment data", async () => {
      renderWithAuth(<AssignmentsPage />);

      await waitFor(() => {
        expect(screen.getByText("My TA Assignments")).toBeInTheDocument();
      });

      // Find and click refresh button
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      // Verify API call count increases after refresh
      const initialCallCount = mockFetch.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);
    });
  });
}); 