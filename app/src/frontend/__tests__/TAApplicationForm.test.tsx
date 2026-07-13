import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TAApplicationForm from "../src/components/taApplication/TAApplicationForm";

// Mock the APIs
vi.mock("../src/api/applicationApi", () => ({
  getAvailableCourses: vi
    .fn()
    .mockResolvedValue([{ course_id: 1, name: "Test Course" }]),
  getDomainAreas: vi.fn().mockResolvedValue([{ id: 1, name: "Test Area" }]),
  submitTAApplication: vi.fn().mockResolvedValue({ success: true }),
  checkDeadlineStatus: vi.fn().mockResolvedValue({
    isPassed: false,
    message: "Application deadline is approaching",
    deadlineFormatted: "2025-01-15"
  }),
}));

// Mock the profile API
vi.mock("../src/api/profileApi", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    user: {
      user_id: 1,
      name: "Test User",
      email: "test@example.com",
      major: "Computer Science",
      student_number: "12345678"
    }
  }),
}));

// Mock fetch for the complete-profile endpoint
global.fetch = vi.fn();

const renderTAApplicationForm = () => {
  return render(
    <BrowserRouter>
      <TAApplicationForm />
    </BrowserRouter>
  );
};

describe("TAApplicationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful profile fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: {
          user_id: 1,
          name: "Test User",
          email: "test@example.com",
          major: "Computer Science",
          student_number: "12345678"
        },
        profile: {
          overall_gpa: 3.5,
          expected_graduation: "2025",
          relevant_coursework: "COSC 111, COSC 121",
          technical_skills: "Python, Java, JavaScript",
          teaching_experience: "Tutoring experience",
          weekly_availability: "{}"
        }
      })
    });
  });

  describe("Form Rendering", () => {
    it("renders the course preferences section", async () => {
      renderTAApplicationForm();
      await waitFor(() => {
        expect(screen.getByText("Course Preferences")).toBeInTheDocument();
      });
    });

    it("renders the submit button", async () => {
      renderTAApplicationForm();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /submit application/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("submits the form successfully with empty optional fields", async () => {
      renderTAApplicationForm();

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText("Course Preferences")).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /submit application/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/application submitted successfully/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("shows error message when API calls fail", async () => {
      const { getAvailableCourses } = await import("../src/api/applicationApi");
      (getAvailableCourses as any).mockRejectedValue(new Error("API Error"));

      renderTAApplicationForm();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load required data/i)
        ).toBeInTheDocument();
      });
    });
  });
});
