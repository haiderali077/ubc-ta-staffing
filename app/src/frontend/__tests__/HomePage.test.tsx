import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../src/context/ThemeContext";
import { LandingPage } from "../src/pages/HomePage";

// Mock window.matchMedia for tests
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("HomePage", () => {
  describe("Core Rendering", () => {
    it("renders the main hero title", () => {
      renderHomePage();
      expect(screen.getByText("TA Hiring,")).toBeInTheDocument();
      expect(screen.getByText("Reimagined.")).toBeInTheDocument();
    });

    it("displays the hero description", () => {
      renderHomePage();
      expect(
        screen.getByText(/AllocAid simplifies TA applications/)
      ).toBeInTheDocument();
    });

    it("renders the hero image", () => {
      renderHomePage();
      const heroImage = screen.getByAltText("UBC Campus with Cherry Blossoms");
      expect(heroImage).toBeInTheDocument();
    });

    it("renders the main call-to-action buttons", () => {
      renderHomePage();
      expect(
        screen.getByRole("link", { name: /get started/i })
      ).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: /login/i })).toHaveLength(2);
    });
  });

  describe("Navigation", () => {
    it("navigates to correct pages", () => {
      renderHomePage();

      const getStartedLink = screen.getByRole("link", { name: /get started/i });
      const loginLinks = screen.getAllByRole("link", { name: /login/i });
      const loginLink = loginLinks[0]; // Use the first login link

      expect(getStartedLink).toHaveAttribute("href", "/register");
      expect(loginLink).toHaveAttribute("href", "/login");

      // Check both "Learn more" links exist
      const learnMoreLinks = screen.getAllByRole("link", {
        name: /learn more/i,
      });
      expect(learnMoreLinks).toHaveLength(2);

      // Check the first one (anchor link)
      expect(learnMoreLinks[0]).toHaveAttribute("href", "#learn-more");

      // Check the second one (register link)
      expect(learnMoreLinks[1]).toHaveAttribute("href", "/register");
    });
  });

  describe("Features Section", () => {
    it("renders the features section title", () => {
      renderHomePage();
      expect(screen.getByText("Built for every role")).toBeInTheDocument();
    });

    it("displays the features description", () => {
      renderHomePage();
      expect(
        screen.getByText(/Streamlined workflows designed specifically/)
      ).toBeInTheDocument();
    });

    it("displays all three role sections", () => {
      renderHomePage();
      expect(screen.getByText("For Students")).toBeInTheDocument();
      expect(screen.getByText("For Instructors")).toBeInTheDocument();
      expect(screen.getByText("For TA Coordinators")).toBeInTheDocument();
    });
  });
});
