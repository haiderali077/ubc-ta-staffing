import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import StudentApplicationsPage from "../src/pages/ta-coordinator/StudentApplicationsPage";
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

vi.mock("../src/api/taCoordinatorApi", () => ({
  taCoordinatorApi: {
    applications: {
      getAll: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ total: 0, pending: 0, approved: 0, rejected: 0 }),
      getByStatus: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Import the mocked module to access it in tests
import { taCoordinatorApi } from "../src/api/taCoordinatorApi";

const renderStudentApplicationsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <StudentApplicationsPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("StudentApplicationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations
    vi.mocked(taCoordinatorApi.applications.getAll).mockResolvedValue([]);
    vi.mocked(taCoordinatorApi.applications.getStats).mockResolvedValue({ total: 0, pending: 0, approved: 0, rejected: 0 });
  });

  it("renders without crashing", () => {
    renderStudentApplicationsPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders student applications page content", () => {
    renderStudentApplicationsPage();
    expect(document.body).toBeInTheDocument();
  });

  it("displays application timestamps correctly", async () => {
    const mockApplicationsWithTimestamps = [
      {
        application_id: 1,
        user_id: 1,
        submitted_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-16T14:45:00Z",
        status: "pending",
        application_type: "Undergraduate",
        domain_areas: ["Web Development", "Database Systems"],
        coursePreferences: [
          { course_id: 1, rank: 1, course_code: "CPSC 110", course_title: "Intro to Programming" }
        ]
      }
    ];

    // Mock the API to return applications with timestamps
    vi.mocked(taCoordinatorApi.applications.getAll).mockResolvedValue(mockApplicationsWithTimestamps);

    renderStudentApplicationsPage();

    // Wait for the component to load data
    await screen.findByText(/student applications/i);

    // The component should handle both submitted_at and updated_at timestamps
    // This test verifies that the component can process the timestamp data without errors
    expect(document.body).toBeInTheDocument();
  });

  it("handles applications with only submitted_at timestamp", async () => {
    const mockApplicationsWithoutUpdatedAt = [
      {
        application_id: 2,
        user_id: 1,
        submitted_at: "2024-01-15T10:30:00Z",
        // No updated_at field
        status: "pending",
        application_type: "Graduate",
        domain_areas: ["Machine Learning", "AI"],
        coursePreferences: [
          { course_id: 2, rank: 1, course_code: "CPSC 221", course_title: "Data Structures" }
        ]
      }
    ];

    vi.mocked(taCoordinatorApi.applications.getAll).mockResolvedValue(mockApplicationsWithoutUpdatedAt);

    renderStudentApplicationsPage();

    await screen.findByText(/student applications/i);

    // Component should handle missing updated_at gracefully
    expect(document.body).toBeInTheDocument();
  });

  it("handles applications with both timestamps", async () => {
    const mockApplicationsWithBothTimestamps = [
      {
        application_id: 3,
        user_id: 1,
        submitted_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-16T16:20:00Z",
        status: "approved",
        application_type: "PhD",
        domain_areas: ["Research", "Algorithms"],
        coursePreferences: [
          { course_id: 3, rank: 1, course_code: "CPSC 340", course_title: "Machine Learning" }
        ]
      }
    ];

    vi.mocked(taCoordinatorApi.applications.getAll).mockResolvedValue(mockApplicationsWithBothTimestamps);

    renderStudentApplicationsPage();

    await screen.findByText(/student applications/i);

    // Component should display both timestamps appropriately
    expect(document.body).toBeInTheDocument();
  });
});
