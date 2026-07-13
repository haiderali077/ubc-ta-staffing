import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Navigation } from "../src/components/layout/Navigation";

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: false,
  user: null as any,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", async () => {
  const actual = await vi.importActual("../src/context/AuthContext");
  return {
    ...actual,
    useAuth: () => mockAuthContext,
  };
});

const renderNavigation = (props = {}) => {
  return render(
    <BrowserRouter>
      <Navigation {...props} />
    </BrowserRouter>
  );
};

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.user = null;
  });

  describe("Public Navigation", () => {
    it("shows only home link when user is not authenticated", () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.user = null;

      renderNavigation();

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("Student Navigation", () => {
    it("shows student-specific navigation items", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { role: "student" };
      
      renderNavigation();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Apply")).toBeInTheDocument();
      expect(screen.getByText("My Applications")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  describe("Instructor Navigation", () => {
    it("shows instructor-specific navigation items", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { role: "instructor" };
      
      renderNavigation();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Submit Request")).toBeInTheDocument();
      expect(screen.getByText("Assigned TAs")).toBeInTheDocument();
    });
  });

  describe("TA Coordinator Navigation", () => {
    it("shows TA coordinator-specific navigation items", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { role: "ta_coordinator" };
      
      renderNavigation();

      expect(screen.getByText("Academic Terms")).toBeInTheDocument();
      expect(screen.getByText("Course Offerings")).toBeInTheDocument();
      expect(screen.getByText("Instructor Assignment")).toBeInTheDocument();
      expect(screen.getByText("TA Requests")).toBeInTheDocument();
      expect(screen.getByText("Student Applications")).toBeInTheDocument();
      expect(screen.getByText("Allocations")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
    });
  });

  describe("Admin Navigation", () => {
    it("shows admin-specific navigation items", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { role: "admin" };

      renderNavigation();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("System Settings")).toBeInTheDocument();
    });
  });
});
