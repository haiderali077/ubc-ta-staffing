import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, expect, it, describe, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Replace global localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock the auth context
const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Test Student", email: "student@test.com", role: "student" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

// Mock API calls
vi.mock("../src/api/applicationApi", () => ({
  applicationApi: {
    submitApplication: vi.fn().mockResolvedValue({ success: true }),
    getMyApplications: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../src/api/profileApi", () => ({
  getDomainAreas: vi.fn().mockResolvedValue([
    "Web Development",
    "Database Systems",
    "Machine Learning"
  ]),
}));

// You'll need to import your actual TA Application component
// For now, I'll create a mock component that demonstrates the testing pattern
const MockTAApplicationForm = () => {
  const [formData, setFormData] = React.useState({
    notes: "",
    coursePreferences: [],
    domainAreas: [],
  });

  // Simulate loading draft from localStorage on mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem("ta-application-draft");
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData(parsedDraft);
      } catch (error) {
        console.error("Failed to parse draft:", error);
      }
    }
  }, []);

  // Simulate saving draft to localStorage when form changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.notes || formData.coursePreferences.length > 0) {
        localStorage.setItem("ta-application-draft", JSON.stringify(formData));
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [formData]);

  const handleSubmit = () => {
    // Clear draft when submitting
    localStorage.removeItem("ta-application-draft");
    // Simulate submission logic
  };

  return (
    <form>
      <label htmlFor="notes">Notes:</label>
      <textarea
        id="notes"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        placeholder="Enter your notes"
      />
      
      <button type="button" onClick={handleSubmit}>
        Submit Application
      </button>
      
      <button 
        type="button" 
        onClick={() => {
          localStorage.removeItem("ta-application-draft");
          setFormData({ notes: "", coursePreferences: [], domainAreas: [] });
        }}
      >
        Clear Draft
      </button>
    </form>
  );
};

const renderTAApplicationForm = () => {
  return render(
    <BrowserRouter>
      <MockTAApplicationForm />
    </BrowserRouter>
  );
};

describe("TA Application Draft Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it("saves draft to localStorage when form data changes", async () => {
    renderTAApplicationForm();
    
    const notesField = screen.getByLabelText(/notes/i);
    
    // Type in the notes field
    fireEvent.change(notesField, { target: { value: "This is a draft note" } });
    
    // Wait for debounced save
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ta-application-draft",
        expect.stringContaining("This is a draft note")
      );
    }, { timeout: 1000 });
  });

  it("loads draft from localStorage on component mount", async () => {
    const draftData = {
      notes: "Previously saved draft",
      coursePreferences: [],
      domainAreas: [],
    };
    
    // Pre-populate localStorage with draft data
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(draftData));
    
    renderTAApplicationForm();
    
    // Check that the form is populated with draft data
    expect(screen.getByDisplayValue("Previously saved draft")).toBeInTheDocument();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("ta-application-draft");
  });

  it("clears draft from localStorage when application is submitted", async () => {
    renderTAApplicationForm();
    
    // Add some draft content
    const notesField = screen.getByLabelText(/notes/i);
    fireEvent.change(notesField, { target: { value: "Draft content" } });
    
    // Wait for draft to be saved
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
    
    // Submit the application
    const submitButton = screen.getByText(/submit application/i);
    fireEvent.click(submitButton);
    
    // Check that draft is cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("ta-application-draft");
  });

  it("handles corrupted localStorage data gracefully", async () => {
    // Set invalid JSON in localStorage
    mockLocalStorage.getItem.mockReturnValue("invalid-json-data");
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderTAApplicationForm();
    
    // Form should still render without errors
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    
    // Should not crash and should log the error
    expect(consoleSpy).toHaveBeenCalledWith("Failed to parse draft:", expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it("does not save empty drafts to localStorage", async () => {
    renderTAApplicationForm();
    
    // Don't type anything - form should remain empty
    
    // Wait a bit to ensure no save happens
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Should not save empty drafts
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("allows manual clearing of drafts", async () => {
    renderTAApplicationForm();
    
    // Add some draft content
    const notesField = screen.getByLabelText(/notes/i);
    fireEvent.change(notesField, { target: { value: "Draft to be cleared" } });
    
    // Wait for draft to be saved
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
    
    // Clear the draft manually
    const clearButton = screen.getByText(/clear draft/i);
    fireEvent.click(clearButton);
    
    // Check that draft is removed
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("ta-application-draft");
    
    // Check that form is cleared
    expect(screen.getByLabelText(/notes/i)).toHaveValue("");
  });

  it("preserves draft data across component re-renders", async () => {
    const draftData = {
      notes: "Persistent draft data",
      coursePreferences: [],
      domainAreas: [],
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(draftData));
    
    const { unmount } = renderTAApplicationForm();
    
    // Verify data loads
    expect(screen.getByDisplayValue("Persistent draft data")).toBeInTheDocument();
    
    // Unmount and remount component
    unmount();
    renderTAApplicationForm();
    
    // Data should still be there
    expect(screen.getByDisplayValue("Persistent draft data")).toBeInTheDocument();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("ta-application-draft");
  });

  it("updates draft incrementally as user types", async () => {
    renderTAApplicationForm();
    
    const notesField = screen.getByLabelText(/notes/i);
    
    // Type first part
    fireEvent.change(notesField, { target: { value: "First" } });
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ta-application-draft",
        expect.stringContaining("First")
      );
    });
    
    // Clear the mock to track next call
    mockLocalStorage.setItem.mockClear();
    
    // Type more
    fireEvent.change(notesField, { target: { value: "First and second" } });
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ta-application-draft",
        expect.stringContaining("First and second")
      );
    });
  });
});
