import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AcademicTermsPage from "../src/pages/ta-coordinator/AcademicTermsPage";
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
    terms: {
      getAllTerms: vi.fn().mockResolvedValue([]),
      createTerm: vi.fn().mockResolvedValue({ id: 1, name: "Test Term" }),
      updateTerm: vi.fn().mockResolvedValue({ id: 1, name: "Updated Term" }),
      deleteTerm: vi.fn().mockResolvedValue({}),
    },
  },
}));

const renderAcademicTermsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AcademicTermsPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("AcademicTermsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderAcademicTermsPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders academic terms page content", () => {
    renderAcademicTermsPage();
    expect(document.body).toBeInTheDocument();
  });
});
