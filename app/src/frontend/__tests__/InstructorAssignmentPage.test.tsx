import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InstructorAssignmentPage from "../src/pages/ta-coordinator/InstructorAssignmentPage";
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
    instructors: {
      getAll: vi.fn().mockResolvedValue([]),
      getCoursesWithAssignments: vi.fn().mockResolvedValue([]),
      assignToCourse: vi.fn().mockResolvedValue({}),
      unassignFromCourse: vi.fn().mockResolvedValue({}),
    },
  },
}));

const renderInstructorAssignmentPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <InstructorAssignmentPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("InstructorAssignmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderInstructorAssignmentPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders instructor assignment page content", () => {
    renderInstructorAssignmentPage();
    expect(document.body).toBeInTheDocument();
  });
});
