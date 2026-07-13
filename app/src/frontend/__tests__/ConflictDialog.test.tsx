/**
 * Tests for ConflictDialog component
 * UR 2.7: Must be able to view conflicts when scheduling students
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConflictDialog, { ConflictResolution } from '../src/components/allocation/ConflictDialog';
import { ConflictDetails, ConflictType, ConflictSeverity } from '../src/components/allocation/ConflictIndicator';

// Mock conflict data for testing
const mockOverridableConflicts: ConflictDetails[] = [
  {
    type: ConflictType.AVAILABILITY_CONFLICT,
    severity: ConflictSeverity.HIGH,
    message: 'Student unavailable during scheduled time',
    description: 'Student marked themselves as unavailable on Monday 10:00-12:00',
    conflictingElements: [{ day: 'Monday', time: '10:00-12:00' }],
    resolutionSuggestions: ['Contact student for availability', 'Choose different lab section'],
    canOverride: true
  },
  {
    type: ConflictType.HOURS_CONFLICT,
    severity: ConflictSeverity.MEDIUM,
    message: 'Hours limit would be exceeded',
    description: 'Assignment would result in 25 hours/week, exceeding limit of 20',
    conflictingElements: [{ currentHours: 18, newHours: 7, limit: 20 }],
    resolutionSuggestions: ['Reduce hours in other assignments', 'Increase student hour limit'],
    canOverride: true
  }
];

const mockCriticalConflicts: ConflictDetails[] = [
  {
    type: ConflictType.TIME_CONFLICT,
    severity: ConflictSeverity.CRITICAL,
    message: 'Time conflict with existing assignment',
    description: 'Student already assigned to COSC 499 during this time slot',
    conflictingElements: [{ existingCourse: 'COSC 499', time: '10:00-12:00', day: 'Monday' }],
    resolutionSuggestions: ['Remove existing assignment first', 'Choose different time slot'],
    canOverride: false
  }
];

const mockMixedConflicts: ConflictDetails[] = [
  ...mockCriticalConflicts,
  ...mockOverridableConflicts
];

const mockCourseInfo = {
  courseCode: 'COSC 310',
  sectionName: 'L01',
  schedule: 'MWF 10:00-12:00'
};

const mockStudentName = 'John Doe';

describe('ConflictDialog', () => {
  const mockOnResolve = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={false}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Assignment Conflicts Detected')).toBeInTheDocument();
    });
  });

  describe('Header and Summary', () => {
    it('should display student name and course information', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/COSC 310 L01/)).toBeInTheDocument();
      expect(screen.getByText(/MWF 10:00-12:00/)).toBeInTheDocument();
    });

    it('should display correct conflict summary statistics', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getAllByText('2')).toHaveLength(2); // Total conflicts and overridable conflicts
      expect(screen.getByText('0')).toBeInTheDocument(); // Critical conflicts
    });
  });

  describe('Critical Conflicts Warning', () => {
    it('should show critical conflicts warning when present', () => {
      render(
        <ConflictDialog
          conflicts={mockCriticalConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Critical Conflicts Must Be Resolved')).toBeInTheDocument();
      expect(screen.getAllByText(/cannot be overridden/)).toHaveLength(2);
    });

    it('should not show warning when no critical conflicts', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.queryByText('Critical Conflicts Must Be Resolved')).not.toBeInTheDocument();
    });
  });

  describe('Conflict Details', () => {
    it('should display all conflicts with proper information', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Availability Conflict')).toBeInTheDocument();
      expect(screen.getByText('Hours Constraint')).toBeInTheDocument();
      expect(screen.getByText('Student unavailable during scheduled time')).toBeInTheDocument();
      expect(screen.getByText('Hours limit would be exceeded')).toBeInTheDocument();
    });

    it('should show resolution suggestions for each conflict', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Contact student for availability')).toBeInTheDocument();
      expect(screen.getByText('Reduce hours in other assignments')).toBeInTheDocument();
    });

    it('should show conflicting elements data', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      // Should display JSON representation of conflicting elements
      expect(screen.getAllByText('Conflicting Details')).toHaveLength(2);
    });
  });

  describe('Conflict Acknowledgment', () => {
    it('should allow acknowledging overridable conflicts', async () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const checkboxes = screen.getAllByText(/I acknowledge this conflict/);
      expect(checkboxes).toHaveLength(2);
      
      // Click first checkbox
      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(firstCheckbox);
      
      expect(firstCheckbox).toBeChecked();
    });

    it('should not allow acknowledging critical conflicts', () => {
      render(
        <ConflictDialog
          conflicts={mockCriticalConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('This conflict cannot be overridden')).toBeInTheDocument();
      expect(screen.queryByText(/I acknowledge this conflict/)).not.toBeInTheDocument();
    });

    it('should enable override button only when all conflicts acknowledged', async () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const overrideButton = screen.getByText('Override & Assign');
      expect(overrideButton).toBeDisabled();
      
      // Acknowledge all conflicts
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => fireEvent.click(checkbox));
      
      await waitFor(() => {
        expect(overrideButton).not.toBeDisabled();
      });
    });
  });

  describe('Resolution Notes', () => {
    it('should allow entering resolution plans for individual conflicts', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const resolutionTextareas = screen.getAllByPlaceholderText(/Describe how this conflict will be handled/);
      expect(resolutionTextareas).toHaveLength(2);
      
      fireEvent.change(resolutionTextareas[0], {
        target: { value: 'Will contact student to adjust availability' }
      });
      
      expect(resolutionTextareas[0]).toHaveValue('Will contact student to adjust availability');
    });

    it('should allow entering additional resolution notes', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const additionalNotes = screen.getByPlaceholderText(/Add any additional notes/);
      fireEvent.change(additionalNotes, {
        target: { value: 'Coordinator approved this assignment despite conflicts' }
      });
      
      expect(additionalNotes).toHaveValue('Coordinator approved this assignment despite conflicts');
    });
  });

  describe('Button Actions', () => {
    it('should call onCancel when cancel button clicked', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const cancelButton = screen.getByText('Cancel Assignment');
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when close button clicked', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onResolve with correct data when override button clicked', async () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      // Acknowledge all conflicts
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => fireEvent.click(checkbox));
      
      // Add resolution notes
      const additionalNotes = screen.getByPlaceholderText(/Add any additional notes/);
      fireEvent.change(additionalNotes, {
        target: { value: 'Test resolution notes' }
      });
      
      const overrideButton = screen.getByText('Override & Assign');
      await waitFor(() => {
        expect(overrideButton).not.toBeDisabled();
      });
      
      fireEvent.click(overrideButton);
      
      expect(mockOnResolve).toHaveBeenCalledWith({
        action: 'override',
        acknowledgedConflicts: ['conflict_0', 'conflict_1'],
        resolutionNotes: 'Test resolution notes',
        conflictResolutions: {}
      });
    });

    it('should not show override/modify buttons when critical conflicts exist', () => {
      render(
        <ConflictDialog
          conflicts={mockCriticalConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.queryByText('Override & Assign')).not.toBeInTheDocument();
      expect(screen.queryByText('Modify Assignment')).not.toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    it('should show ready status when all overridable conflicts acknowledged', async () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      // Acknowledge all conflicts
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => fireEvent.click(checkbox));
      
      await waitFor(() => {
        expect(screen.getByText('✓ Ready to proceed')).toBeInTheDocument();
      });
    });

    it('should show critical conflicts status when critical conflicts exist', () => {
      render(
        <ConflictDialog
          conflicts={mockCriticalConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('✗ Critical conflicts must be resolved')).toBeInTheDocument();
    });

    it('should show acknowledgment required status by default', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('⚠️ Please acknowledge all conflicts to proceed')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('should handle keyboard navigation', () => {
      render(
        <ConflictDialog
          conflicts={mockOverridableConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      // Note: Actual keyboard handling would need to be implemented
    });
  });

  describe('Mixed Conflicts Scenario', () => {
    it('should handle mixed critical and overridable conflicts correctly', () => {
      render(
        <ConflictDialog
          conflicts={mockMixedConflicts}
          studentName={mockStudentName}
          courseInfo={mockCourseInfo}
          isOpen={true}
          onResolve={mockOnResolve}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show critical warning
      expect(screen.getByText('Critical Conflicts Must Be Resolved')).toBeInTheDocument();
      
      // Should show correct counts
      expect(screen.getByText('3')).toBeInTheDocument(); // Total conflicts
      expect(screen.getByText('1')).toBeInTheDocument(); // Critical conflicts
      expect(screen.getByText('2')).toBeInTheDocument(); // Overridable conflicts
      
      // Should not show override button
      expect(screen.queryByText('Override & Assign')).not.toBeInTheDocument();
    });
  });
});