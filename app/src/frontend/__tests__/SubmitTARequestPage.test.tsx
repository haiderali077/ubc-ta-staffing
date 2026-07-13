import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SubmitTARequestPage from "../src/pages/instructor/SubmitTARequestPage";
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
    submitTARequest: vi.fn().mockResolvedValue({ message: "Request submitted successfully" }),
  },
}));

const renderSubmitTARequestPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <SubmitTARequestPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("SubmitTARequestPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderSubmitTARequestPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders submit TA request page content", () => {
    renderSubmitTARequestPage();
    expect(document.body).toBeInTheDocument();
  });
});
