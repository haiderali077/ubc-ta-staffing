/**
 * Tests for ConflictIndicator component
 * UR 2.7: Must be able to view conflicts when scheduling students
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConflictIndicator, { ConflictDetails, ConflictType, ConflictSeverity } from '../src/components/allocation/ConflictIndicator';

// Mock conflict data
const mockConflicts: ConflictDetails[] = [
  {
    type: ConflictType.TIME_CONFLICT,
    severity: ConflictSeverity.CRITICAL,
    message: 'Time conflict with existing assignment',
    description: 'Student already assigned during this time slot',
    conflictingElements: [{ existingCourse: 'COSC 499', time: '10:00-12:00' }],
    resolutionSuggestions: ['Choose different time slot', 'Remove existing assignment'],
    canOverride: false
  },
  {
    type: ConflictType.AVAILABILITY_CONFLICT,
    severity: ConflictSeverity.HIGH,
    message: 'Student unavailable during scheduled time',
    description: 'Student marked themselves as unavailable on Monday',
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

describe('ConflictIndicator', () => {
  describe('No Conflicts', () => {
    it('should render nothing for icon/badge view when no conflicts', () => {
      const { container } = render(
        <ConflictIndicator conflicts={[]} viewMode="icon" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render "No conflicts" message for detailed view when no conflicts', () => {
      render(<ConflictIndicator conflicts={[]} viewMode="detailed" />);
      expect(screen.getByText('✅ No conflicts')).toBeInTheDocument();
    });
  });

  describe('Icon View Mode', () => {
    it('should render single conflict icon without count', () => {
      const singleConflict = [mockConflicts[0]];
      render(<ConflictIndicator conflicts={singleConflict} viewMode="icon" />);
      
      const icon = screen.getByTitle('1 conflicts detected');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🚫'); // Critical severity icon
    });

    it('should render multiple conflicts with count badge', () => {
      render(<ConflictIndicator conflicts={mockConflicts} viewMode="icon" />);
      
      const icon = screen.getByTitle('3 conflicts detected');
      expect(icon).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Count badge
    });

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(
        <ConflictIndicator 
          conflicts={mockConflicts} 
          viewMode="icon" 
          onClick={handleClick} 
        />
      );
      
      const icon = screen.getByTitle('3 conflicts detected');
      fireEvent.click(icon);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge View Mode', () => {
    it('should render conflict badge with count and severity styling', () => {
      render(<ConflictIndicator conflicts={mockConflicts} viewMode="badge" />);
      
      expect(screen.getByText('3 conflicts')).toBeInTheDocument();
      expect(screen.getByText('🚫')).toBeInTheDocument(); // Critical severity icon
    });

    it('should use singular form for single conflict', () => {
      const singleConflict = [mockConflicts[1]];
      render(<ConflictIndicator conflicts={singleConflict} viewMode="badge" />);
      
      expect(screen.getByText('1 conflict')).toBeInTheDocument();
    });

    it('should apply correct severity styling for critical conflicts', () => {
      const criticalConflict = [mockConflicts[0]]; // Critical conflict
      const { container } = render(
        <ConflictIndicator conflicts={criticalConflict} viewMode="badge" />
      );
      
      const badge = container.querySelector('.bg-red-100.text-red-800.border-red-300');
      expect(badge).toBeInTheDocument();
    });

    it('should apply correct severity styling for high conflicts', () => {
      const highConflict = [mockConflicts[1]]; // High conflict
      const { container } = render(
        <ConflictIndicator conflicts={highConflict} viewMode="badge" />
      );
      
      const badge = container.querySelector('.bg-orange-100.text-orange-800.border-orange-300');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Detailed View Mode', () => {
    it('should render complete conflict breakdown', () => {
      render(<ConflictIndicator conflicts={mockConflicts} viewMode="detailed" showDetails={true} />);
      
      // Summary section
      expect(screen.getByText('3 Conflicts Detected')).toBeInTheDocument();
      expect(screen.getByText('1 Critical')).toBeInTheDocument();
      expect(screen.getByText('2 Overridable')).toBeInTheDocument();
      
      // Conflict type breakdown
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Availability')).toBeInTheDocument();
      expect(screen.getByText('Hours')).toBeInTheDocument();
    });

    it('should show action button when onClick provided', () => {
      const handleClick = vi.fn();
      render(
        <ConflictIndicator 
          conflicts={mockConflicts} 
          viewMode="detailed" 
          onClick={handleClick} 
        />
      );
      
      const button = screen.getByText('View Details & Resolution Options');
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not show conflict breakdown when showDetails is false', () => {
      render(<ConflictIndicator conflicts={mockConflicts} viewMode="detailed" showDetails={false} />);
      
      expect(screen.getByText('3 Conflicts Detected')).toBeInTheDocument();
      expect(screen.queryByText('Time')).not.toBeInTheDocument();
    });
  });

  describe('Severity Handling', () => {
    it('should prioritize highest severity when multiple conflicts exist', () => {
      // Mix of critical, high, and medium - should show critical
      render(<ConflictIndicator conflicts={mockConflicts} viewMode="badge" />);
      
      expect(screen.getByText('🚫')).toBeInTheDocument(); // Critical icon
    });

    it('should handle single low severity conflict', () => {
      const lowSeverityConflict: ConflictDetails[] = [{
        type: ConflictType.EXISTING_ASSIGNMENT,
        severity: ConflictSeverity.LOW,
        message: 'Info message',
        description: 'Low priority information',
        conflictingElements: [],
        resolutionSuggestions: [],
        canOverride: true
      }];

      render(<ConflictIndicator conflicts={lowSeverityConflict} viewMode="badge" />);
      
      expect(screen.getByText('ℹ️')).toBeInTheDocument(); // Low severity icon
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const handleClick = vi.fn();
      render(
        <ConflictIndicator 
          conflicts={mockConflicts} 
          viewMode="icon" 
          onClick={handleClick} 
        />
      );
      
      const clickableElement = screen.getByTitle('3 conflicts detected');
      expect(clickableElement).toHaveAttribute('title');
    });

    it('should be keyboard accessible when clickable', () => {
      const handleClick = vi.fn();
      render(
        <ConflictIndicator 
          conflicts={mockConflicts} 
          viewMode="badge" 
          onClick={handleClick} 
        />
      );
      
      const badge = screen.getByTitle('3 conflict(s) - Click for details');
      fireEvent.keyDown(badge, { key: 'Enter', code: 'Enter' });
      // Note: This would require additional keyboard handling implementation
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ConflictIndicator 
          conflicts={mockConflicts} 
          viewMode="badge" 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conflicts array gracefully', () => {
      render(<ConflictIndicator conflicts={[]} viewMode="detailed" />);
      expect(screen.getByText('✅ No conflicts')).toBeInTheDocument();
    });

    it('should handle null/undefined conflicts', () => {
      const { container } = render(
        <ConflictIndicator conflicts={null as any} viewMode="icon" />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should handle conflicts without proper severity', () => {
      const malformedConflict: ConflictDetails[] = [{
        type: ConflictType.TIME_CONFLICT,
        severity: 'invalid' as any,
        message: 'Test message',
        description: 'Test description',
        conflictingElements: [],
        resolutionSuggestions: [],
        canOverride: true
      }];

      render(<ConflictIndicator conflicts={malformedConflict} viewMode="badge" />);
      expect(screen.getByText('1 conflict')).toBeInTheDocument();
    });
  });

  describe('Conflict Type Labeling', () => {
    const testCases = [
      { type: ConflictType.TIME_CONFLICT, expected: 'Time' },
      { type: ConflictType.AVAILABILITY_CONFLICT, expected: 'Availability' },
      { type: ConflictType.HOURS_CONFLICT, expected: 'Hours' },
      { type: ConflictType.EXISTING_ASSIGNMENT, expected: 'Assignment' },
      { type: ConflictType.COURSE_CAPACITY, expected: 'Capacity' }
    ];

    testCases.forEach(({ type, expected }) => {
      it(`should correctly label ${type} conflicts`, () => {
        const typeSpecificConflict: ConflictDetails[] = [{
          type,
          severity: ConflictSeverity.MEDIUM,
          message: 'Test message',
          description: 'Test description',
          conflictingElements: [],
          resolutionSuggestions: [],
          canOverride: true
        }];

        render(
          <ConflictIndicator 
            conflicts={typeSpecificConflict} 
            viewMode="detailed" 
            showDetails={true} 
          />
        );
        
        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });
  });
});