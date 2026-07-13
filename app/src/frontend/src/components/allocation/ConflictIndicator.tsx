import React from 'react';

// Conflict types and interfaces matching backend
export enum ConflictType {
  TIME_CONFLICT = 'time_conflict',
  AVAILABILITY_CONFLICT = 'availability_conflict',
  HOURS_CONFLICT = 'hours_conflict',
  EXISTING_ASSIGNMENT = 'existing_assignment',
  COURSE_CAPACITY = 'course_capacity'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ConflictDetails {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  description: string;
  conflictingElements: any[];
  resolutionSuggestions: string[];
  canOverride: boolean;
}

interface ConflictIndicatorProps {
  conflicts: ConflictDetails[];
  showDetails?: boolean;
  viewMode?: 'icon' | 'badge' | 'detailed';
  className?: string;
  onClick?: () => void;
}

const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  conflicts,
  showDetails = false,
  viewMode = 'badge',
  className = '',
  onClick
}) => {
  if (!conflicts || conflicts.length === 0) {
    return viewMode === 'detailed' ? (
      <div className={`flex items-center text-green-600 ${className}`}>
        <span className="text-sm">✅ No conflicts</span>
      </div>
    ) : null;
  }

  const severityOrder = [ConflictSeverity.CRITICAL, ConflictSeverity.HIGH, ConflictSeverity.MEDIUM, ConflictSeverity.LOW];
  const highestSeverity = severityOrder.find(severity => 
    conflicts.some(c => c.severity === severity)
  ) || ConflictSeverity.LOW;

  const criticalConflicts = conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL);
  const overridableConflicts = conflicts.filter(c => c.canOverride);

  const getSeverityColor = (severity: ConflictSeverity) => {
    switch (severity) {
      case ConflictSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-300';
      case ConflictSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case ConflictSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case ConflictSeverity.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: ConflictSeverity) => {
    switch (severity) {
      case ConflictSeverity.CRITICAL:
        return '🚫';
      case ConflictSeverity.HIGH:
        return '⚠️';
      case ConflictSeverity.MEDIUM:
        return '⚡';
      case ConflictSeverity.LOW:
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getConflictTypeLabel = (type: ConflictType) => {
    switch (type) {
      case ConflictType.TIME_CONFLICT:
        return 'Time';
      case ConflictType.AVAILABILITY_CONFLICT:
        return 'Availability';
      case ConflictType.HOURS_CONFLICT:
        return 'Hours';
      case ConflictType.EXISTING_ASSIGNMENT:
        return 'Assignment';
      case ConflictType.COURSE_CAPACITY:
        return 'Capacity';
      default:
        return 'Unknown';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Icon view mode - simple icon with conflict count
  if (viewMode === 'icon') {
    return (
      <div 
        className={`inline-flex items-center cursor-pointer ${className}`}
        onClick={handleClick}
        title={`${conflicts.length} conflicts detected`}
      >
        <span className="text-lg">{getSeverityIcon(highestSeverity)}</span>
        {conflicts.length > 1 && (
          <span className="ml-1 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
            {conflicts.length}
          </span>
        )}
      </div>
    );
  }

  // Badge view mode - compact badge with severity color
  if (viewMode === 'badge') {
    return (
      <div 
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border cursor-pointer ${getSeverityColor(highestSeverity)} ${className}`}
        onClick={handleClick}
        title={`${conflicts.length} conflict(s) - Click for details`}
      >
        <span className="mr-1">{getSeverityIcon(highestSeverity)}</span>
        <span>{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  // Detailed view mode - full conflict breakdown
  if (viewMode === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Summary */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(highestSeverity)}`}>
          <div className="flex items-center">
            <span className="text-lg mr-2">{getSeverityIcon(highestSeverity)}</span>
            <div>
              <span className="font-medium">
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Detected
              </span>
              {criticalConflicts.length > 0 && (
                <div className="text-xs text-red-600 font-medium">
                  {criticalConflicts.length} Critical
                </div>
              )}
            </div>
          </div>
          <div className="text-right text-xs">
            {overridableConflicts.length > 0 && (
              <div className="text-green-600">
                {overridableConflicts.length} Overridable
              </div>
            )}
          </div>
        </div>

        {/* Conflict breakdown by type */}
        {showDetails && (
          <div className="space-y-1">
            {Object.values(ConflictType).map(type => {
              const typeConflicts = conflicts.filter(c => c.type === type);
              if (typeConflicts.length === 0) return null;

              const typeHighestSeverity = severityOrder.find(severity => 
                typeConflicts.some(c => c.severity === severity)
              ) || ConflictSeverity.LOW;

              return (
                <div 
                  key={type}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${getSeverityColor(typeHighestSeverity)}`}
                >
                  <span className="flex items-center">
                    <span className="mr-1">{getSeverityIcon(typeHighestSeverity)}</span>
                    {getConflictTypeLabel(type)}
                  </span>
                  <span className="font-medium">{typeConflicts.length}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick actions */}
        {onClick && (
          <button
            onClick={handleClick}
            className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View Details & Resolution Options
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default ConflictIndicator;