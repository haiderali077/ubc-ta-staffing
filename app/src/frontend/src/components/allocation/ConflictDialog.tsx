import React, { useState } from 'react';
import { ConflictDetails, ConflictSeverity, ConflictType } from './ConflictIndicator';

export interface ConflictResolution {
  action: 'cancel' | 'override' | 'modify';
  acknowledgedConflicts: string[];
  resolutionNotes: string;
  conflictResolutions: Record<string, string>;
}

interface ConflictDialogProps {
  conflicts: ConflictDetails[];
  studentName: string;
  courseInfo: {
    courseCode: string;
    sectionName: string;
    schedule: string;
  };
  isOpen: boolean;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  conflicts,
  studentName,
  courseInfo,
  isOpen,
  onResolve,
  onCancel
}) => {
  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState<string[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const criticalConflicts = conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL);
  const overridableConflicts = conflicts.filter(c => c.canOverride);
  const canProceed = criticalConflicts.length === 0 && acknowledgedConflicts.length === conflicts.length;

  const getSeverityColor = (severity: ConflictSeverity) => {
    switch (severity) {
      case ConflictSeverity.CRITICAL:
        return 'border-red-400 bg-red-50';
      case ConflictSeverity.HIGH:
        return 'border-orange-400 bg-orange-50';
      case ConflictSeverity.MEDIUM:
        return 'border-yellow-400 bg-yellow-50';
      case ConflictSeverity.LOW:
        return 'border-blue-400 bg-blue-50';
      default:
        return 'border-gray-400 bg-gray-50';
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
        return 'Time Conflict';
      case ConflictType.AVAILABILITY_CONFLICT:
        return 'Availability Conflict';
      case ConflictType.HOURS_CONFLICT:
        return 'Hours Constraint';
      case ConflictType.EXISTING_ASSIGNMENT:
        return 'Existing Assignment';
      case ConflictType.COURSE_CAPACITY:
        return 'Course Capacity';
      default:
        return 'Unknown Conflict';
    }
  };

  const handleConflictAcknowledge = (conflictIndex: number, acknowledged: boolean) => {
    const conflictId = `conflict_${conflictIndex}`;
    if (acknowledged) {
      setAcknowledgedConflicts(prev => [...prev.filter(id => id !== conflictId), conflictId]);
    } else {
      setAcknowledgedConflicts(prev => prev.filter(id => id !== conflictId));
    }
  };

  const handleResolutionChange = (conflictIndex: number, resolution: string) => {
    setConflictResolutions(prev => ({
      ...prev,
      [`conflict_${conflictIndex}`]: resolution
    }));
  };

  const handleResolve = (action: 'override' | 'modify') => {
    onResolve({
      action,
      acknowledgedConflicts,
      resolutionNotes,
      conflictResolutions
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-red-500 mr-3 text-2xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Assignment Conflicts Detected
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Assigning <strong>{studentName}</strong> to <strong>{courseInfo.courseCode} {courseInfo.sectionName}</strong>
              </p>
            </div>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 text-xl p-1"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Conflict Summary</h3>
              <div className="text-sm text-gray-600">
                Schedule: {courseInfo.schedule}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
                <div className="text-gray-600">Total Conflicts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{criticalConflicts.length}</div>
                <div className="text-gray-600">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{overridableConflicts.length}</div>
                <div className="text-gray-600">Overridable</div>
              </div>
            </div>
          </div>

          {/* Critical Conflicts Warning */}
          {criticalConflicts.length > 0 && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-red-500 text-lg mr-2">🚫</span>
                <h4 className="font-medium text-red-800">Critical Conflicts Must Be Resolved</h4>
              </div>
              <p className="text-sm text-red-700">
                These conflicts cannot be overridden and must be resolved before proceeding with the assignment.
              </p>
            </div>
          )}

          {/* Detailed Conflicts */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 mb-3">Conflict Details</h3>
            
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getSeverityColor(conflict.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">{getSeverityIcon(conflict.severity)}</span>
                      <h4 className="font-medium text-gray-900">
                        {getConflictTypeLabel(conflict.type)}
                      </h4>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full uppercase font-semibold ${
                        conflict.severity === ConflictSeverity.CRITICAL ? 'bg-red-200 text-red-800' :
                        conflict.severity === ConflictSeverity.HIGH ? 'bg-orange-200 text-orange-800' :
                        conflict.severity === ConflictSeverity.MEDIUM ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {conflict.severity}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{conflict.message}</p>
                    <p className="text-xs text-gray-600 mb-3">{conflict.description}</p>

                    {/* Conflicting Elements */}
                    {conflict.conflictingElements.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Conflicting Details
                        </h5>
                        <div className="bg-white p-2 rounded text-xs">
                          <pre className="whitespace-pre-wrap text-gray-700">
                            {JSON.stringify(conflict.conflictingElements, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Resolution Suggestions */}
                    {conflict.resolutionSuggestions.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          Suggested Resolutions
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {conflict.resolutionSuggestions.map((suggestion, suggestionIndex) => (
                            <li key={suggestionIndex} className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resolution Selection */}
                    {conflict.canOverride && (
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={acknowledgedConflicts.includes(`conflict_${index}`)}
                            onChange={(e) => handleConflictAcknowledge(index, e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">
                            I acknowledge this conflict and choose to proceed
                          </span>
                        </label>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Resolution Plan (Optional)
                          </label>
                          <textarea
                            className="w-full text-xs border border-gray-300 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Describe how this conflict will be handled..."
                            value={conflictResolutions[`conflict_${index}`] || ''}
                            onChange={(e) => handleResolutionChange(index, e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Non-overridable indicator */}
                    {!conflict.canOverride && (
                      <div className="flex items-center text-red-600 text-sm">
                        <span className="mr-2">🔒</span>
                        <span>This conflict cannot be overridden</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Resolution Notes
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Add any additional notes about how these conflicts will be managed..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {canProceed ? (
              <span className="text-green-600 font-medium">✓ Ready to proceed</span>
            ) : criticalConflicts.length > 0 ? (
              <span className="text-red-600 font-medium">✗ Critical conflicts must be resolved</span>
            ) : (
              <span className="text-yellow-600 font-medium">⚠️ Please acknowledge all conflicts to proceed</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel Assignment
            </button>
            
            {criticalConflicts.length === 0 && (
              <>
                <button
                  onClick={() => handleResolve('modify')}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Modify Assignment
                </button>
                
                <button
                  onClick={() => handleResolve('override')}
                  disabled={!canProceed}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                    canProceed
                      ? 'text-yellow-700 bg-yellow-100 border border-yellow-300 hover:bg-yellow-200'
                      : 'text-gray-400 bg-gray-100 border border-gray-300 cursor-not-allowed'
                  }`}
                >
                  Override & Assign
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictDialog;