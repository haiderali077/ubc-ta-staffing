import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { StudentDashboard } from "../src/pages/student/StudentDashboard";
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
  user_id: 1,
  email: "student@ubc.ca",
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

vi.mock("../src/api/applicationApi", () => ({
  getMyApplications: vi.fn().mockResolvedValue([]),
}));

// Mock fetch globally to prevent async operations after test teardown
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe("StudentDashboard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    
    // Mock fetch responses to prevent async operations after test teardown
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/notifications")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: [] }),
        });
      }
      if (url.includes("/assignments")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ assignments: [] }),
        });
      }
      if (url.includes("/complete-profile")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            profile: { 
              year_of_study: "3rd Year", 
              technical_skills: "JavaScript, React", 
              teaching_experience: "None" 
            }, 
            user: { 
              name: "Test Student", 
              email: "student@ubc.ca", 
              major: "Computer Science" 
            } 
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderWithAuth(<StudentDashboard />);
    // Just check that the component renders without throwing errors
    expect(document.body).toBeInTheDocument();
  });

  it("renders a container element", () => {
    renderWithAuth(<StudentDashboard />);
    // Check for any container or wrapper element
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });
});
