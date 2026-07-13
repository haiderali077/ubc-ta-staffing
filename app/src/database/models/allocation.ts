import { AuditLogger } from '../../backend/services/auditLogger.ts';
import { Database } from '../config.ts';

export interface TAAllocation {
    allocation_id?: number;
    lab_section_id: number;
    user_id: number;
    allocated_at?: Date;
    allocated_by?: number;
    status?: 'active' | 'completed' | 'cancelled';
    notes?: string;
    is_marker?: boolean;
}

export interface ApprovedApplication {
    application_id: number;
    user_id: number;
    name: string;
    email: string;
    major: string;
    student_number?: string;
    gpa?: number;
    course_preferences: Array<{
        course_id: number;
        rank: number;
        course_code: string;
        course_title: string;
    }>;
}

export interface LabSectionWithSlots {
    lab_section_id: number;
    course_id: number;
    course_code: string;
    course_title: string;
    term: string;
    section_name: string;
    lab_days: string;
    lab_start_time: string;
    lab_end_time: string;
    instructor_name?: string;
    total_slots: number;
    filled_slots: number;
    remaining_slots: number;
    assigned_students: Array<{
        user_id: number;
        name: string;
        email: string;
        major: string;
        allocation_id: number;
    }>;
}

export class AllocationModel {
    private db: Database;
    private auditLogger: AuditLogger;

    constructor(database: Database) {
        this.db = database;
        this.auditLogger = new AuditLogger(database);
    }

    // Get all approved applications available for allocation
    async getApprovedApplications(): Promise<ApprovedApplication[]> {
        const query = `
        SELECT 
            ta.application_id,
            ta.user_id,
            u.name,
            u.email,
            u.major,
            u.student_number,
            p.overall_gpa as gpa,
            p.weekly_availability,
            p.max_hours_per_week,
            COALESCE(
                json_agg(
                    json_build_object(
                        'course_id', ar.course_id,
                        'rank', ar.rank,
                        'course_code', c.code,
                        'course_title', c.title
                    ) ORDER BY ar.rank
                ) FILTER (WHERE ar.application_id IS NOT NULL),
                '[]'::json
            ) as course_preferences
        FROM ta_applications ta
        JOIN users u ON ta.user_id = u.user_id
        LEFT JOIN student_profiles p ON ta.user_id = p.user_id
        LEFT JOIN applicationrankings ar ON ta.application_id = ar.application_id
        LEFT JOIN courses c ON ar.course_id = c.course_id
        WHERE ta.status = 'approved'
        GROUP BY ta.application_id, ta.user_id, u.name, u.email, u.major, u.student_number, 
                 p.overall_gpa, p.weekly_availability, p.max_hours_per_week
        ORDER BY u.name
        `;

        const result = await this.db.query(query);
        return result.rows as any[];
    }

    // Get all lab sections with their TA slot information (only for courses with coordinator-approved TA needs)
    async getLabSectionsWithSlots(): Promise<LabSectionWithSlots[]> {
        const query = `
        SELECT 
            ls.lab_section_id,
            ls.course_id,
            c.code as course_code,
            c.title as course_title,
            c.term,
            ls.section_name,
            ls.lab_days,
            ls.lab_start_time,
            ls.lab_end_time,
            instructor.name as instructor_name,
            999 as total_slots,  -- Effectively unlimited since we're now hours-based
            COUNT(alloc.allocation_id)::integer as filled_slots,
            (999 - COUNT(alloc.allocation_id))::integer as remaining_slots,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', student.user_id,
                        'name', student.name,
                        'email', student.email,
                        'major', student.major,
                        'allocation_id', alloc.allocation_id,
                        'is_marker', alloc.is_marker
                    )
                ) FILTER (WHERE alloc.allocation_id IS NOT NULL),
                '[]'::json
            ) as assigned_students
        FROM lab_sections ls
        JOIN courses c ON ls.course_id = c.course_id
        JOIN ta_needs tn ON c.course_id = tn.course_id
        LEFT JOIN users instructor ON c.instructor_id = instructor.user_id
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        LEFT JOIN users student ON alloc.user_id = student.user_id
        WHERE tn.status = 'filled'
        GROUP BY ls.lab_section_id, ls.course_id, c.code, c.title, c.term, ls.section_name, 
                 ls.lab_days, ls.lab_start_time, ls.lab_end_time, instructor.name
        ORDER BY c.code, c.term, ls.section_name
        `;

        const result = await this.db.query(query);
        return result.rows as any[];
    }

    // Assign a student to a lab section
    async assignStudentToLabSection(
        userId: number, 
        labSectionId: number, 
        allocatedBy: number, 
        notes?: string,
        actorEmail?: string,
        studentEmail?: string,
        courseCode?: string,
        isMarker?: boolean
    ): Promise<TAAllocation> {
        // Check if student is already assigned to this lab section
        const existingQuery = `
        SELECT allocation_id FROM ta_allocations 
        WHERE user_id = $1 AND lab_section_id = $2 AND status = 'active'
        `;
        const existing = await this.db.query(existingQuery, [userId, labSectionId]);
        
        if (existing.rows.length > 0) {
            throw new Error('Student is already assigned to this lab section');
        }

        // Get student and course details for audit logging
        const detailsQuery = `
        SELECT 
            u.email as student_email,
            u.name as student_name,
            c.code as course_code,
            c.title as course_title,
            actor.email as actor_email
        FROM users u
        CROSS JOIN courses c
        LEFT JOIN users actor ON actor.user_id = $3
        WHERE u.user_id = $1 AND c.course_id = (SELECT course_id FROM lab_sections WHERE lab_section_id = $2)
        `;
        const detailsResult = await this.db.query(detailsQuery, [userId, labSectionId, allocatedBy]);
        const details = detailsResult.rows[0] as any;

        // Check if lab section has available slots (1 slot per lab section)
        const slotQuery = `
        SELECT 
            ls.lab_section_id,
            CASE 
                WHEN alloc.allocation_id IS NOT NULL THEN 1
                ELSE 0
            END as filled_slots
        FROM lab_sections ls
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        WHERE ls.lab_section_id = $1
        `;
        const slotResult = await this.db.query(slotQuery, [labSectionId]);
        
        if (slotResult.rows.length === 0) {
            throw new Error('Lab section not found');
        }

        const slotData = slotResult.rows[0] as any;
        if (slotData.filled_slots >= 1) {
            throw new Error('Lab section already has a TA assigned');
        }

        // Create the allocation
        const insertQuery = `
        INSERT INTO ta_allocations (lab_section_id, user_id, allocated_by, notes, status, is_marker)
        VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING *
        `;

        const result = await this.db.query<TAAllocation>(insertQuery, [
            labSectionId,
            userId,
            allocatedBy,
            notes || null,
            isMarker || false
        ]);

        const allocation = result.rows[0];

        // Log the assignment action with timestamp
        try {
            await this.auditLogger.logAssignment(
                'ASSIGN',
                allocatedBy,
                actorEmail || details.actor_email,
                userId,
                studentEmail || details.student_email,
                details.course_id,
                courseCode || details.course_code,
                allocation.allocation_id,
                undefined, // previous_values
                { 
                    status: 'active',
                    notes: notes || null,
                    course: details.course_title,
                    student: details.student_name
                },
                notes
            );
        } catch (auditError) {
            console.error('Failed to log assignment audit:', auditError);
            // Don't fail the operation if audit logging fails
        }

        return allocation;
    }

    // Unassign a student from a course
    async unassignStudent(
        allocationId: number, 
        actorId?: number, 
        actorEmail?: string
    ): Promise<boolean> {
        // Get allocation details before unassigning for audit logging
        const detailsQuery = `
        SELECT 
            ta.allocation_id,
            ta.user_id,
            ls.course_id,
            ta.notes,
            ta.status,
            u.email as student_email,
            u.name as student_name,
            c.code as course_code,
            c.title as course_title
        FROM ta_allocations ta
        JOIN users u ON ta.user_id = u.user_id
        JOIN lab_sections ls ON ta.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        WHERE ta.allocation_id = $1 AND ta.status = 'active'
        `;
        
        const detailsResult = await this.db.query(detailsQuery, [allocationId]);
        const allocationDetails = detailsResult.rows[0] as any;

        if (!allocationDetails) {
            return false; // Allocation not found or already inactive
        }

        const query = `
        DELETE FROM ta_allocations 
        WHERE allocation_id = $1 AND status = 'active'
        `;

        const result = await this.db.query(query, [allocationId]);
        const success = result.rowCount > 0;

        // Log the unassignment action with timestamp
        if (success && actorId && actorEmail) {
            try {
                await this.auditLogger.logAssignment(
                    'UNASSIGN',
                    actorId,
                    actorEmail,
                    allocationDetails.user_id,
                    allocationDetails.student_email,
                    allocationDetails.course_id,
                    allocationDetails.course_code,
                    allocationId,
                    { 
                        status: 'active',
                        course: allocationDetails.course_title,
                        student: allocationDetails.student_name
                    },
                    { 
                        status: 'cancelled',
                        course: allocationDetails.course_title,
                        student: allocationDetails.student_name
                    }
                );
            } catch (auditError) {
                console.error('Failed to log unassignment audit:', auditError);
                // Don't fail the operation if audit logging fails
            }
        }

        return success;
    }

    // Update allocation status or notes with audit logging
    async updateAllocation(
        allocationId: number,
        updates: { status?: 'active' | 'completed' | 'cancelled'; notes?: string },
        actorId: number,
        actorEmail: string
    ): Promise<TAAllocation | null> {
        // Get current allocation details for audit logging
        const currentQuery = `
        SELECT 
            ta.*,
            u.email as student_email,
            u.name as student_name,
            c.code as course_code,
            c.title as course_title
        FROM ta_allocations ta
        JOIN users u ON ta.user_id = u.user_id
        JOIN lab_sections ls ON ta.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        WHERE ta.allocation_id = $1
        `;
        
        const currentResult = await this.db.query(currentQuery, [allocationId]);
        if (currentResult.rows.length === 0) {
            return null;
        }
        
        const currentAllocation = currentResult.rows[0] as any;
        
        // Build update query dynamically
        const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
        if (fields.length === 0) {
            return currentAllocation;
        }

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const updateQuery = `
        UPDATE ta_allocations 
        SET ${setClause}
        WHERE allocation_id = $1
        RETURNING *
        `;

        const values = [allocationId, ...fields.map(field => updates[field as keyof typeof updates])];
        const result = await this.db.query<TAAllocation>(updateQuery, values);
        
        if (result.rows.length === 0) {
            return null;
        }

        const updatedAllocation = result.rows[0];

        // Log the update action with detailed changes
        try {
            const previous_values = {
                status: currentAllocation.status,
                notes: currentAllocation.notes
            };
            
            const new_values = {
                status: updatedAllocation.status,
                notes: updatedAllocation.notes
            };

            await this.auditLogger.logAssignment(
                'UPDATE_STATUS',
                actorId,
                actorEmail,
                currentAllocation.user_id,
                currentAllocation.student_email,
                currentAllocation.course_id,
                currentAllocation.course_code,
                allocationId,
                previous_values,
                new_values
            );
        } catch (auditError) {
            console.error('Failed to log allocation update audit:', auditError);
            // Don't fail the operation if audit logging fails
        }

        return updatedAllocation;
    }

    // Update marker designation for an allocation
    async updateMarkerDesignation(
        allocationId: number,
        isMarker: boolean,
        actorId: number,
        actorEmail: string
    ): Promise<TAAllocation | null> {
        // Get current allocation details
        const currentQuery = `
        SELECT 
            ta.*,
            u.email as student_email,
            u.name as student_name,
            c.code as course_code,
            c.title as course_title
        FROM ta_allocations ta
        JOIN users u ON ta.user_id = u.user_id
        JOIN lab_sections ls ON ta.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        WHERE ta.allocation_id = $1
        `;
        
        const currentResult = await this.db.query(currentQuery, [allocationId]);
        
        if (currentResult.rows.length === 0) {
            return null;
        }
        
        const currentAllocation = currentResult.rows[0] as {
            user_id: number;
            student_email: string;
            course_id: number;
            course_code: string;
            is_marker: boolean;
        };

        // Update marker status
        const updateQuery = `
        UPDATE ta_allocations 
        SET is_marker = $2
        WHERE allocation_id = $1
        RETURNING *
        `;
        
        const result = await this.db.query<TAAllocation>(updateQuery, [allocationId, isMarker]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const updatedAllocation = result.rows[0];

        // Log the marker designation change
        try {
            await this.auditLogger.logAssignment(
                'UPDATE_STATUS',
                actorId,
                actorEmail,
                currentAllocation.user_id,
                currentAllocation.student_email,
                currentAllocation.course_id,
                currentAllocation.course_code,
                allocationId,
                { is_marker: currentAllocation.is_marker },
                { is_marker: isMarker }
            );
        } catch (auditError) {
            console.error('Failed to log marker designation audit:', auditError);
            // Don't fail the operation if audit logging fails
        }

        return updatedAllocation;
    }

    // Get allocation statistics
    async getAllocationStats(): Promise<any> {
        const query = `
        SELECT 
            CAST(COUNT(DISTINCT ta.application_id) AS INTEGER) as total_approved_applications,
            CAST(COUNT(DISTINCT alloc.user_id) AS INTEGER) as total_assigned_students,
            CAST(COUNT(DISTINCT ta.application_id) - COUNT(DISTINCT alloc.user_id) AS INTEGER) as unassigned_students,
            CAST(COUNT(DISTINCT ls.lab_section_id) AS INTEGER) as total_lab_sections,
            CAST(COUNT(DISTINCT ls.lab_section_id) AS INTEGER) as total_ta_slots,
            CAST(COUNT(alloc.allocation_id) AS INTEGER) as filled_slots
        FROM ta_applications ta
        LEFT JOIN ta_allocations alloc ON ta.user_id = alloc.user_id AND alloc.status = 'active'
        LEFT JOIN lab_sections ls ON alloc.lab_section_id = ls.lab_section_id
        WHERE ta.status = 'approved'
        `;

        const result = await this.db.query(query);
        return result.rows[0];
    }

    // Get student assignment history
    async getStudentAssignments(userId: number): Promise<TAAllocation[]> {
        const query = `
        SELECT 
            alloc.*,
            ls.section_name,
            ls.lab_days,
            ls.lab_start_time,
            ls.lab_end_time,
            c.code as course_code,
            c.title as course_title,
            c.term,
            allocator.name as allocated_by_name
        FROM ta_allocations alloc
        JOIN lab_sections ls ON alloc.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        LEFT JOIN users allocator ON alloc.allocated_by = allocator.user_id
        WHERE alloc.user_id = $1
        ORDER BY alloc.allocated_at DESC
        `;

        const result = await this.db.query(query, [userId]);
        return result.rows as any[];
    }

    // Get allocations for a specific lab section
    async getAllocationsByLabSection(labSectionId: number): Promise<TAAllocation[]> {
        const query = `
        SELECT 
            alloc.*,
            u.name as student_name,
            u.email as student_email
        FROM ta_allocations alloc
        JOIN users u ON alloc.user_id = u.user_id
        WHERE alloc.lab_section_id = $1
        ORDER BY alloc.allocated_at DESC
        `;

        const result = await this.db.query<TAAllocation>(query, [labSectionId]);
        return result.rows;
    }
}