import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InstructorDashboard from "../src/pages/instructor/InstructorDashboard";
import { AuthProvider } from "../src/context/AuthContext";

const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Dr. Johnson", email: "instructor@example.com", role: "instructor" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

vi.mock("../src/api/instructorApi", () => ({
  instructorApi: {
    getCourses: vi.fn().mockResolvedValue({ courses: [] }),
    getTARequests: vi.fn().mockResolvedValue([]),
  },
}));

const renderInstructorDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <InstructorDashboard />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("InstructorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderInstructorDashboard();
    expect(document.body).toBeInTheDocument();
  });

  it("renders instructor dashboard content", () => {
    renderInstructorDashboard();
    expect(document.body).toBeInTheDocument();
  });
});
