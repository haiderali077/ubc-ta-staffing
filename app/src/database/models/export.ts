import { Analytics } from '../../frontend/src/pages/ta-coordinator/exportTypes.ts';
import { Database } from '../config.ts';

export interface CourseAllocationReportData {
    course_id: number;
    course_code: string;
    course_title: string;
    term: string;
    instructor_name: string;
    total_ta_slots: number;
    filled_slots: number;
    remaining_slots: number;
    hours_requested: number;
    hours_assigned: number;
    assigned_students: Array<{
        user_id: number;
        name: string;
        email: string;
        major: string;
        allocated_at: string;
        notes: string;
    }>;
}

export interface StudentAssignmentReportData {
    user_id: number;
    student_name: string;
    student_email: string;
    student_number: string;
    major: string;
    total_assignments: number;
    total_hours: number;
    assignments: Array<{
        course_code: string;
        course_title: string;
        term: string;
        allocated_at: string;
        status: string;
        notes: string;
    }>;
}

export interface HoursComparisonReportData {
    course_code: string;
    course_title: string;
    term: string;
    instructor_name: string;
    hours_requested: number;
    hours_assigned: number;
    ta_slots_requested: number;
    ta_slots_filled: number;
    utilization_rate: number;
}
interface AnalyticsWithRawData {
  analytics: Analytics;
  rawData?: {
    allocations?: unknown[];
    students?: unknown[];
    courses?: unknown[];
    departments?: unknown[];
  };
}

export class ExportModel {
    constructor(public db: Database) {}

    // Get course-wise allocation report data
    async getCourseAllocationReportData(term?: string): Promise<CourseAllocationReportData[]> {
        let query = `
        SELECT 
            c.course_id,
            c.code as course_code,
            c.title as course_title,
            c.term,
            COALESCE(instructor.name, 'Unassigned') as instructor_name,
            CAST(COALESCE(tn.hours_required, 0) AS INTEGER) as total_ta_slots,
            CAST(COUNT(alloc.allocation_id) AS INTEGER) as filled_slots,
            CAST(GREATEST(0, COALESCE(tn.hours_required, 0) - COUNT(alloc.allocation_id)) AS INTEGER) as remaining_slots,
            CAST(COALESCE(tn.hours_required, 0) AS INTEGER) as hours_requested,
            CAST(COUNT(alloc.allocation_id) * 10 AS INTEGER) as hours_assigned,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', student.user_id,
                        'name', student.name,
                        'email', student.email,
                        'major', student.major,
                        'allocated_at', alloc.allocated_at,
                        'notes', COALESCE(alloc.notes, '')
                    )
                ) FILTER (WHERE alloc.allocation_id IS NOT NULL),
                '[]'::json
            ) as assigned_students
        FROM courses c
        LEFT JOIN users instructor ON c.instructor_id = instructor.user_id
        LEFT JOIN ta_needs tn ON c.course_id = tn.course_id AND tn.status IN ('open', 'filled')
        LEFT JOIN lab_sections ls ON c.course_id = ls.course_id
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        LEFT JOIN users student ON alloc.user_id = student.user_id
        `;

        const params: any[] = [];
        if (term) {
            query += ` WHERE c.term = $1`;
            params.push(term);
        }

        query += `
        GROUP BY c.course_id, c.code, c.title, c.term, instructor.name, tn.hours_required
        ORDER BY c.code, c.term
        `;

        const result = await this.db.query(query, params);
        return result.rows.map((row: any) => ({
            course_id: row.course_id,
            course_code: row.course_code,
            course_title: row.course_title,
            term: row.term,
            instructor_name: row.instructor_name,
            total_ta_slots: row.total_ta_slots,
            filled_slots: row.filled_slots,
            remaining_slots: row.remaining_slots,
            hours_requested: row.hours_requested,
            hours_assigned: row.hours_assigned,
            assigned_students: Array.isArray(row.assigned_students)
                ? row.assigned_students
                : JSON.parse(row.assigned_students)
        })) as CourseAllocationReportData[];
    }

    // Get student assignment report data
    async getStudentAssignmentReportData(term?: string): Promise<StudentAssignmentReportData[]> {
        let query = `
        SELECT 
            u.user_id,
            u.name as student_name,
            u.email as student_email,
            u.student_number,
            u.major,
            CAST(COUNT(alloc.allocation_id) AS INTEGER) as total_assignments,
            CAST(COUNT(alloc.allocation_id) * 10 AS INTEGER) as total_hours, -- Assuming 10 hours per assignment
            json_agg(
                json_build_object(
                    'course_code', c.code,
                    'course_title', c.title,
                    'term', c.term,
                    'allocated_at', alloc.allocated_at,
                    'status', alloc.status,
                    'notes', COALESCE(alloc.notes, '')
                )
                ORDER BY alloc.allocated_at DESC
            ) as assignments
        FROM users u
        INNER JOIN ta_allocations alloc ON u.user_id = alloc.user_id
        INNER JOIN lab_sections ls ON alloc.lab_section_id = ls.lab_section_id
        INNER JOIN courses c ON ls.course_id = c.course_id
        WHERE u.role = 'student' AND alloc.status IN ('active', 'completed')
        `;

        const params: any[] = [];
        if (term) {
            query += ` AND c.term = $1`;
            params.push(term);
        }

        query += `
        GROUP BY u.user_id, u.name, u.email, u.student_number, u.major
        ORDER BY u.name
        `;

        const result = await this.db.query(query, params);
        return result.rows.map((row: any) => ({
            user_id: row.user_id,
            student_name: row.student_name,
            student_email: row.student_email,
            student_number: row.student_number,
            major: row.major,
            total_assignments: row.total_assignments,
            total_hours: row.total_hours,
            assignments: Array.isArray(row.assignments)
                ? row.assignments
                : JSON.parse(row.assignments)
        })) as StudentAssignmentReportData[];
    }

    // Get hours comparison report data
    async getHoursComparisonReportData(term?: string): Promise<HoursComparisonReportData[]> {
        let query = `
        SELECT 
            c.code as course_code,
            c.title as course_title,
            c.term,
            COALESCE(instructor.name, 'Unassigned') as instructor_name,
            CAST(COALESCE(tn.hours_required, 0) AS INTEGER) as hours_requested,
            CAST(COUNT(alloc.allocation_id) * 10 AS INTEGER) as hours_assigned,
            CAST(COALESCE(tn.hours_required, 0) AS INTEGER) as ta_slots_requested,
            CAST(COUNT(alloc.allocation_id) AS INTEGER) as ta_slots_filled,
            CASE 
                WHEN COALESCE(tn.hours_required, 0) > 0 
                THEN ROUND((COUNT(alloc.allocation_id)::DECIMAL / tn.hours_required * 100), 2)
                ELSE 0
            END as utilization_rate
        FROM courses c
        LEFT JOIN users instructor ON c.instructor_id = instructor.user_id
        LEFT JOIN ta_needs tn ON c.course_id = tn.course_id AND tn.status IN ('open', 'filled')
        LEFT JOIN lab_sections ls ON c.course_id = ls.course_id
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        `;

        const params: any[] = [];
        if (term) {
            query += ` WHERE c.term = $1`;
            params.push(term);
        }

        query += `
        GROUP BY c.course_id, c.code, c.title, c.term, instructor.name, tn.hours_required
        HAVING COALESCE(tn.hours_required, 0) > 0
        ORDER BY c.code, c.term
        `;

        const result = await this.db.query(query, params);
        return result.rows.map((row: any) => ({
            course_code: row.course_code,
            course_title: row.course_title,
            term: row.term,
            instructor_name: row.instructor_name,
            hours_requested: row.hours_requested,
            hours_assigned: row.hours_assigned,
            ta_slots_requested: row.ta_slots_requested,
            ta_slots_filled: row.ta_slots_filled,
            utilization_rate: row.utilization_rate
        })) as HoursComparisonReportData[];
    }

    // Get available terms for filtering
    async getAvailableTerms(): Promise<string[]> {
        const query = `
        SELECT DISTINCT term 
        FROM courses 
        WHERE term IS NOT NULL 
        ORDER BY term
        `;
        
        const result = await this.db.query(query);
        return result.rows.map(row => (row as any).term);
    }

    // Get analytics data for dashboard
    async getAnalytics(term?: string): Promise<{
        total_courses: number;
        total_students: number;
        total_allocations: number;
        unmet_requests: number;
        total_hours_requested: number;
        total_hours_assigned: number;
        utilization_rate: number;
    }> {
        let query = `
        SELECT 
            CAST(COUNT(DISTINCT c.course_id) AS INTEGER) as total_courses,
            CAST(COUNT(DISTINCT alloc.user_id) AS INTEGER) as total_students,
            CAST(COUNT(alloc.allocation_id) AS INTEGER) as total_allocations,
            CAST(COUNT(DISTINCT c.course_id) - COUNT(DISTINCT CASE WHEN alloc.allocation_id IS NOT NULL THEN c.course_id END) AS INTEGER) as unmet_requests,
            CAST(COALESCE(SUM(tn.hours_required), 0) AS INTEGER) as total_hours_requested,
            CAST(COALESCE(COUNT(alloc.allocation_id) * 10, 0) AS INTEGER) as total_hours_assigned,
            CASE 
                WHEN SUM(tn.hours_required) > 0 
                THEN ROUND((COUNT(alloc.allocation_id)::DECIMAL / SUM(tn.hours_required) * 100), 2)
                ELSE 0
            END as utilization_rate
        FROM courses c
        LEFT JOIN ta_needs tn ON c.course_id = tn.course_id AND tn.status IN ('open', 'filled')
        LEFT JOIN lab_sections ls ON c.course_id = ls.course_id
        LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
        `;

        const params: any[] = [];
        if (term) {
            query += ` WHERE c.term = $1`;
            params.push(term);
        }

        const result = await this.db.query(query, params);
        return result.rows[0] as {
            total_courses: number;
            total_students: number;
            total_allocations: number;
            unmet_requests: number;
            total_hours_requested: number;
            total_hours_assigned: number;
            utilization_rate: number;
        };
    }

    // Enhanced getAnalytics method with optional raw data
    async getAnalyticsWithRawData(term?: string, includeRawData = false): Promise<AnalyticsWithRawData> {
    try {
        // Get basic analytics (existing logic)
        const analytics = await this.getAnalytics(term);
        
        const result: AnalyticsWithRawData = { analytics };
        
        // Include raw data if requested
        if (includeRawData) {
        const rawData = await this.getRawAnalyticsData(term);
        result.rawData = rawData;
        }
        
        return result;
    } catch (error) {
        console.error('Error fetching analytics with raw data:', error);
        throw error;
    }
    }

    // New method to fetch raw data for chart generation
    private async getRawAnalyticsData(term?: string): Promise<{
    allocations?: unknown[];
    students?: unknown[];
    courses?: unknown[];
    departments?: unknown[];
    }> {
    try {
        const termCondition = term ? 'WHERE t.name = $1' : '';
        const termParams = term ? [term] : [];
        
        // Get allocations with timing data for weekly trends
        const allocationsQuery = `
        SELECT 
            a.allocation_id,
            a.allocated_at,
            a.created_at,
            a.hours_assigned,
            c.course_code,
            d.name as department_name
        FROM allocations a
        JOIN courses c ON a.course_id = c.course_id
        JOIN departments d ON c.dept_id = d.dept_id
        ${term ? 'JOIN terms t ON c.term_id = t.term_id' : ''}
        ${termCondition}
        ORDER BY a.allocated_at DESC
        `;
        
        // Get students with hours data for distribution
        const studentsQuery = `
        SELECT 
            u.user_id,
            u.name,
            COALESCE(SUM(a.hours_assigned), 0) as total_hours
        FROM users u
        LEFT JOIN allocations a ON u.user_id = a.student_id
        ${term ? 'LEFT JOIN courses c ON a.course_id = c.course_id LEFT JOIN terms t ON c.term_id = t.term_id' : ''}
        WHERE u.role = 'student'
        ${term ? 'AND (t.name = $1 OR t.name IS NULL)' : ''}
        GROUP BY u.user_id, u.name
        `;
        
        // Get courses data
        const coursesQuery = `
        SELECT 
            c.course_id,
            c.course_code,
            c.course_name,
            d.name as department_name,
            COUNT(a.allocation_id) as allocation_count
        FROM courses c
        LEFT JOIN allocations a ON c.course_id = a.course_id
        JOIN departments d ON c.dept_id = d.dept_id
        ${term ? 'JOIN terms t ON c.term_id = t.term_id' : ''}
        ${termCondition}
        GROUP BY c.course_id, c.course_code, c.course_name, d.name
        `;
        
        // Get departments data
        const departmentsQuery = `
        SELECT 
            d.dept_id,
            d.name as department_name,
            COUNT(DISTINCT c.course_id) as course_count,
            COUNT(a.allocation_id) as allocation_count
        FROM departments d
        LEFT JOIN courses c ON d.dept_id = c.dept_id
        ${term ? 'LEFT JOIN terms t ON c.term_id = t.term_id' : ''}
        LEFT JOIN allocations a ON c.course_id = a.course_id
        ${term ? 'WHERE (t.name = $1 OR t.name IS NULL)' : ''}
        GROUP BY d.dept_id, d.name
        HAVING COUNT(DISTINCT c.course_id) > 0 OR COUNT(a.allocation_id) > 0
        `;
        
        // Execute all queries
        const [allocationsResult, studentsResult, coursesResult, departmentsResult] = await Promise.all([
        this.db.query(allocationsQuery, termParams),
        this.db.query(studentsQuery, termParams),
        this.db.query(coursesQuery, termParams),
        this.db.query(departmentsQuery, termParams)
        ]);
        
        return {
        allocations: allocationsResult.rows,
        students: studentsResult.rows,
        courses: coursesResult.rows,
        departments: departmentsResult.rows
        };
    } catch (error) {
        console.error('Error fetching raw analytics data:', error);
        // Return empty data rather than failing completely
        return {
            allocations: [],
            students: [],
            courses: [],
            departments: []
        };
    }
    }
}