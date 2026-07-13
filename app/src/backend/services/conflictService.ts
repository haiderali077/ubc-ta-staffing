import { Database } from "../../database/config.ts";

// Conflict Types and Interfaces
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

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetails[];
  summary: {
    totalConflicts: number;
    criticalConflicts: number;
    overridableConflicts: number;
  };
}

export interface AssignmentRequest {
  userId: number;
  labSectionId: number;
  courseId?: number;
  isMarker?: boolean;
  notes?: string;
}

export interface ScheduleTimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface StudentAvailability {
  userId: number;
  weeklyAvailability: Record<string, string[]>;
  maxHoursPerWeek: number;
  preferences: any;
}

export interface ExistingAssignment {
  allocationId: number;
  userId: number;
  courseCode: string;
  labSectionId: number;
  schedule: ScheduleTimeSlot[];
  hoursPerWeek: number;
  isMarker: boolean;
}

/**
 * Comprehensive ConflictService for TA assignment conflict detection
 * Implements UR 2.7 requirements for viewing conflicts when scheduling students
 */
export class ConflictService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Check for all types of conflicts for a potential assignment
   */
  async checkAssignmentConflicts(assignment: AssignmentRequest): Promise<ConflictCheckResult> {
    const conflicts: ConflictDetails[] = [];

    try {
      // Get student information and existing assignments
      const [studentInfo, labSectionInfo, existingAssignments] = await Promise.all([
        this.getStudentAvailability(assignment.userId),
        this.getLabSectionSchedule(assignment.labSectionId),
        this.getExistingAssignments(assignment.userId)
      ]);

      // 1. Check availability conflicts
      const availabilityConflicts = await this.checkAvailabilityConflicts(
        studentInfo,
        labSectionInfo
      );
      conflicts.push(...availabilityConflicts);

      // 2. Check time conflicts with existing assignments
      const timeConflicts = await this.checkTimeConflicts(
        existingAssignments,
        labSectionInfo
      );
      conflicts.push(...timeConflicts);

      // 3. Check hours constraints
      const hoursConflicts = await this.checkHoursConstraints(
        studentInfo,
        existingAssignments,
        labSectionInfo
      );
      conflicts.push(...hoursConflicts);

      // 4. Check course capacity
      const capacityConflicts = await this.checkCourseCapacity(assignment.labSectionId);
      conflicts.push(...capacityConflicts);

      // 5. Check existing assignments for same course
      const duplicateConflicts = await this.checkDuplicateAssignments(
        assignment.userId,
        assignment.labSectionId
      );
      conflicts.push(...duplicateConflicts);

      const summary = this.generateConflictSummary(conflicts);

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        summary
      };

    } catch (error) {
      console.error("Error checking assignment conflicts:", error);
      console.error("Assignment details:", assignment);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw new Error(`Failed to check assignment conflicts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all conflicts for current assignments
   */
  async getAllAssignmentConflicts(): Promise<ConflictCheckResult[]> {
    try {
      const query = `
        SELECT DISTINCT 
          a.allocation_id,
          a.user_id,
          a.lab_section_id,
          a.is_marker,
          ls.course_id
        FROM ta_allocations a
        JOIN lab_sections ls ON a.lab_section_id = ls.lab_section_id
        WHERE a.status = 'active'
      `;

      const result = await this.db.query(query);
      const assignments = result.rows;

      const conflictResults = await Promise.all(
        assignments.map(async (assignment: any) => {
          return await this.checkAssignmentConflicts({
            userId: assignment.user_id,
            labSectionId: assignment.lab_section_id,
            courseId: assignment.course_id,
            isMarker: assignment.is_marker
          });
        })
      );

      return conflictResults.filter(result => result.hasConflicts);
    } catch (error) {
      console.error("Error getting all assignment conflicts:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw new Error(`Failed to get assignment conflicts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check availability conflicts between student availability and lab schedule
   */
  private async checkAvailabilityConflicts(
    studentInfo: StudentAvailability,
    labSectionInfo: any
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];

    if (!studentInfo.weeklyAvailability || Object.keys(studentInfo.weeklyAvailability).length === 0) {
      conflicts.push({
        type: ConflictType.AVAILABILITY_CONFLICT,
        severity: ConflictSeverity.MEDIUM,
        message: "No availability information found",
        description: "Student has not provided availability information",
        conflictingElements: [],
        resolutionSuggestions: [
          "Request student to update their availability preferences",
          "Contact student to confirm availability"
        ],
        canOverride: true
      });
      return conflicts;
    }

    // Parse lab schedule
    const labDays = this.parseLabDays(labSectionInfo.lab_days);
    const labStartTime = labSectionInfo.lab_start_time;
    const labEndTime = labSectionInfo.lab_end_time;

    for (const day of labDays) {
      const studentDayAvailability = studentInfo.weeklyAvailability[day.toLowerCase()] || [];
      
      if (studentDayAvailability.length === 0) {
        conflicts.push({
          type: ConflictType.AVAILABILITY_CONFLICT,
          severity: ConflictSeverity.HIGH,
          message: `Student unavailable on ${day}`,
          description: `Student has marked themselves as unavailable on ${day} when lab is scheduled`,
          conflictingElements: [{ day, labTime: `${labStartTime}-${labEndTime}` }],
          resolutionSuggestions: [
            "Check if student can adjust their availability",
            "Consider alternative lab sections",
            "Contact student for flexibility"
          ],
          canOverride: true
        });
        continue;
      }

      // Check if any availability slot overlaps with lab time
      const hasOverlap = studentDayAvailability.some(slot => 
        this.timeRangesOverlap(slot, labStartTime, labEndTime)
      );

      if (!hasOverlap) {
        conflicts.push({
          type: ConflictType.AVAILABILITY_CONFLICT,
          severity: ConflictSeverity.HIGH,
          message: `Schedule conflict on ${day}`,
          description: `Student is not available during lab time (${labStartTime}-${labEndTime}) on ${day}`,
          conflictingElements: [{ 
            day, 
            labTime: `${labStartTime}-${labEndTime}`,
            studentAvailability: studentDayAvailability 
          }],
          resolutionSuggestions: [
            "Check alternative lab sections",
            "Verify student availability preferences",
            "Consider schedule adjustments"
          ],
          canOverride: true
        });
      }
    }

    return conflicts;
  }

  /**
   * Check time conflicts with existing assignments
   */
  private async checkTimeConflicts(
    existingAssignments: ExistingAssignment[],
    newLabSection: any
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];
    const newLabDays = this.parseLabDays(newLabSection.lab_days);

    for (const assignment of existingAssignments) {
      for (const existingSchedule of assignment.schedule) {
        for (const newDay of newLabDays) {
          if (existingSchedule.day.toLowerCase() === newDay.toLowerCase()) {
            // Check for time overlap
            if (this.timeRangesOverlap(
              `${existingSchedule.startTime}-${existingSchedule.endTime}`,
              newLabSection.lab_start_time,
              newLabSection.lab_end_time
            )) {
              conflicts.push({
                type: ConflictType.TIME_CONFLICT,
                severity: ConflictSeverity.CRITICAL,
                message: `Time conflict with existing assignment`,
                description: `Conflicts with ${assignment.courseCode} on ${newDay} (${existingSchedule.startTime}-${existingSchedule.endTime})`,
                conflictingElements: [
                  {
                    existingCourse: assignment.courseCode,
                    existingTime: `${existingSchedule.startTime}-${existingSchedule.endTime}`,
                    newLabTime: `${newLabSection.lab_start_time}-${newLabSection.lab_end_time}`,
                    day: newDay
                  }
                ],
                resolutionSuggestions: [
                  "Remove conflicting assignment first",
                  "Choose different lab section",
                  "Adjust lab schedule if possible"
                ],
                canOverride: false
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check hours constraints
   */
  private async checkHoursConstraints(
    studentInfo: StudentAvailability,
    existingAssignments: ExistingAssignment[],
    newLabSection: any
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];

    if (!studentInfo.maxHoursPerWeek) {
      return conflicts; // No constraint set
    }

    // Calculate current total hours
    const currentHours = existingAssignments.reduce((total, assignment) => {
      return total + assignment.hoursPerWeek;
    }, 0);

    // Calculate new lab hours
    const newLabHours = this.calculateLabHours(newLabSection);
    const totalHours = currentHours + newLabHours;

    if (totalHours > studentInfo.maxHoursPerWeek) {
      const severity = totalHours > studentInfo.maxHoursPerWeek * 1.5 
        ? ConflictSeverity.CRITICAL 
        : ConflictSeverity.HIGH;

      conflicts.push({
        type: ConflictType.HOURS_CONFLICT,
        severity,
        message: "Hours limit exceeded",
        description: `Assignment would result in ${totalHours} hours/week, exceeding student's limit of ${studentInfo.maxHoursPerWeek} hours`,
        conflictingElements: [
          {
            currentHours,
            newLabHours,
            totalHours,
            maxHours: studentInfo.maxHoursPerWeek,
            overageHours: totalHours - studentInfo.maxHoursPerWeek
          }
        ],
        resolutionSuggestions: [
          "Consider reducing hours in other assignments",
          "Check if student can increase their hour limit",
          "Choose a lab section with fewer hours"
        ],
        canOverride: severity !== ConflictSeverity.CRITICAL
      });
    }

    return conflicts;
  }

  /**
   * Check course capacity
   */
  private async checkCourseCapacity(labSectionId: number): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];

    try {
      const query = `
        SELECT 
          ls.section_name,
          c.code as course_code,
          c.max_tas,
          COUNT(a.allocation_id) as current_assignments,
          COALESCE(SUM(
            CASE 
              WHEN ls.lab_days IS NOT NULL 
              THEN (
                EXTRACT(EPOCH FROM (ls.lab_end_time::time - ls.lab_start_time::time)) / 3600 *
                array_length(string_to_array(ls.lab_days, ''), 1)
              )
              ELSE 0 
            END
          ), 0) as total_hours_allocated
        FROM lab_sections ls
        JOIN courses c ON ls.course_id = c.course_id
        LEFT JOIN ta_allocations a ON ls.lab_section_id = a.lab_section_id AND a.status = 'active'
        WHERE ls.lab_section_id = $1
        GROUP BY ls.lab_section_id, ls.section_name, c.code, c.max_tas
      `;

      const result = await this.db.query(query, [labSectionId]);
      
      if (result.rows.length > 0) {
        const section = result.rows[0];
        
        if (section.max_tas && section.current_assignments >= section.max_tas) {
          conflicts.push({
            type: ConflictType.COURSE_CAPACITY,
            severity: ConflictSeverity.HIGH,
            message: "Course at TA capacity",
            description: `Course ${section.course_code} has reached its maximum TA capacity`,
            conflictingElements: [
              {
                currentAssignments: section.current_assignments,
                maxTAs: section.max_tas,
                totalHoursAllocated: section.total_hours_allocated
              }
            ],
            resolutionSuggestions: [
              "Increase course maximum TA capacity",
              "Choose a different lab section",
              "Remove existing assignment first"
            ],
            canOverride: true
          });
        }
      }
    } catch (error) {
      console.error("Error checking course capacity:", error);
    }

    return conflicts;
  }

  /**
   * Check for duplicate assignments to same course
   */
  private async checkDuplicateAssignments(
    userId: number,
    labSectionId: number
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];

    try {
      const query = `
        SELECT 
          a.allocation_id,
          c.code as course_code,
          ls.section_name,
          a.is_marker
        FROM ta_allocations a
        JOIN lab_sections ls ON a.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        WHERE a.user_id = $1 
        AND ls.course_id = (
          SELECT course_id 
          FROM lab_sections 
          WHERE lab_section_id = $2
        )
        AND a.status = 'active'
      `;

      const result = await this.db.query(query, [userId, labSectionId]);

      if (result.rows.length > 0) {
        const existingAssignment = result.rows[0];
        
        conflicts.push({
          type: ConflictType.EXISTING_ASSIGNMENT,
          severity: ConflictSeverity.MEDIUM,
          message: "Already assigned to this course",
          description: `Student is already assigned to ${existingAssignment.course_code} ${existingAssignment.section_name}`,
          conflictingElements: [existingAssignment],
          resolutionSuggestions: [
            "Remove existing assignment first",
            "Consider if multiple assignments are needed",
            "Verify this is intentional"
          ],
          canOverride: true
        });
      }
    } catch (error) {
      console.error("Error checking duplicate assignments:", error);
    }

    return conflicts;
  }

  /**
   * Helper methods
   */
  private async getStudentAvailability(userId: number): Promise<StudentAvailability> {
    const query = `
      SELECT 
        weekly_availability,
        max_hours_per_week,
        preferred_course_types,
        specific_course_preferences
      FROM student_profiles
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    const profile = result.rows[0];

    // Check if user exists
    const userQuery = `SELECT user_id FROM users WHERE user_id = $1`;
    const userResult = await this.db.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User with ID ${userId} does not exist`);
    }

    return {
      userId,
      weeklyAvailability: profile?.weekly_availability ? JSON.parse(profile.weekly_availability) : {},
      maxHoursPerWeek: profile?.max_hours_per_week || 20,
      preferences: {
        courseTypes: profile?.preferred_course_types || {},
        specificCourses: profile?.specific_course_preferences || ""
      }
    };
  }

  private async getLabSectionSchedule(labSectionId: number): Promise<any> {
    const query = `
      SELECT 
        ls.*,
        c.code as course_code,
        c.title as course_title
      FROM lab_sections ls
      JOIN courses c ON ls.course_id = c.course_id
      WHERE ls.lab_section_id = $1
    `;

    const result = await this.db.query(query, [labSectionId]);
    const labSection = result.rows[0];
    
    if (!labSection) {
      throw new Error(`Lab section with ID ${labSectionId} does not exist`);
    }
    
    return labSection;
  }

  private async getExistingAssignments(userId: number): Promise<ExistingAssignment[]> {
    const query = `
      SELECT 
        a.allocation_id,
        a.user_id,
        a.is_marker,
        c.code as course_code,
        ls.lab_section_id,
        ls.lab_days,
        ls.lab_start_time,
        ls.lab_end_time
      FROM ta_allocations a
      JOIN lab_sections ls ON a.lab_section_id = ls.lab_section_id
      JOIN courses c ON ls.course_id = c.course_id
      WHERE a.user_id = $1 AND a.status = 'active'
    `;

    const result = await this.db.query(query, [userId]);

    return result.rows.map((row: any) => ({
      allocationId: row.allocation_id,
      userId: row.user_id,
      courseCode: row.course_code,
      labSectionId: row.lab_section_id,
      schedule: this.parseLabSchedule(row.lab_days, row.lab_start_time, row.lab_end_time),
      hoursPerWeek: this.calculateHoursFromSchedule(row.lab_days, row.lab_start_time, row.lab_end_time),
      isMarker: row.is_marker
    }));
  }

  private parseLabDays(labDays: string): string[] {
    if (!labDays) return [];
    
    const dayMap: Record<string, string> = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'R': 'Thursday',
      'F': 'Friday',
      'S': 'Saturday',
      'U': 'Sunday'
    };

    return labDays.split('').map(char => dayMap[char]).filter(Boolean);
  }

  private parseLabSchedule(labDays: string, startTime: string, endTime: string): ScheduleTimeSlot[] {
    const days = this.parseLabDays(labDays);
    return days.map(day => ({
      day,
      startTime,
      endTime
    }));
  }

  private timeRangesOverlap(range1: string, startTime2: string, endTime2: string): boolean {
    try {
      const [start1, end1] = range1.split('-');
      const range1Start = this.parseTime(start1);
      const range1End = this.parseTime(end1);
      const range2Start = this.parseTime(startTime2);
      const range2End = this.parseTime(endTime2);

      return range1Start < range2End && range1End > range2Start;
    } catch {
      return false;
    }
  }

  private parseTime(timeStr: string): number {
    const [time, period] = timeStr.split(/\s+/);
    const [hours, minutes] = time.split(':').map(Number);
    let hour = hours;

    if (period?.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (period?.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }

    return hour * 60 + (minutes || 0);
  }

  private calculateLabHours(labSection: any): number {
    if (!labSection.lab_start_time || !labSection.lab_end_time || !labSection.lab_days) {
      return 0;
    }

    const startMinutes = this.parseTime(labSection.lab_start_time);
    const endMinutes = this.parseTime(labSection.lab_end_time);
    const hoursPerSession = (endMinutes - startMinutes) / 60;
    const daysCount = this.parseLabDays(labSection.lab_days).length;

    return hoursPerSession * daysCount;
  }

  private calculateHoursFromSchedule(labDays: string, startTime: string, endTime: string): number {
    if (!startTime || !endTime || !labDays) return 0;
    
    const startMinutes = this.parseTime(startTime);
    const endMinutes = this.parseTime(endTime);
    const hoursPerSession = (endMinutes - startMinutes) / 60;
    const daysCount = this.parseLabDays(labDays).length;

    return hoursPerSession * daysCount;
  }

  private generateConflictSummary(conflicts: ConflictDetails[]) {
    return {
      totalConflicts: conflicts.length,
      criticalConflicts: conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL).length,
      overridableConflicts: conflicts.filter(c => c.canOverride).length
    };
  }
}