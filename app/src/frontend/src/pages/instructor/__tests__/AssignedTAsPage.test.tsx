import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AssignedTAsPage from '../AssignedTAsPage';
import { useAuth } from '../../../context/AuthContext';

// Mock the auth context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the instructor API
vi.mock('../../../api/instructorApi', () => ({
  instructorApi: {
    getCourses: vi.fn(),
    getCourseDetails: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

const mockUser = {
  user_id: 1,
  name: 'Test Instructor',
  email: 'instructor@test.com',
  role: 'instructor' as const,
};

const MockComponent = () => (
  <BrowserRouter>
    <AssignedTAsPage />
  </BrowserRouter>
);

describe('AssignedTAsPage', () => {
  beforeEach(() => {
    (useAuth as vi.Mock).mockReturnValue({
      user: mockUser,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    const { instructorApi } = await import('../../../api/instructorApi');
    instructorApi.getCourses.mockResolvedValue([{ id: 1, name: 'Test Course' }]);
    instructorApi.getCourseDetails.mockResolvedValue({ id: 1, name: 'Test Course', tas: [] });
    
    render(<MockComponent />);
    await waitFor(() => expect(screen.getByText('Assigned TAs')).toBeInTheDocument());
  });

  it('shows loading state initially', async () => {
    const { instructorApi } = await import('../../../api/instructorApi');
    // Make getCourses never resolve to show loading state
    instructorApi.getCourses.mockImplementation(() => new Promise(() => {}));
    
    render(<MockComponent />);
    // The loading state shows a skeleton animation, not text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
}); 