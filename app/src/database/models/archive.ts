import { Database } from '../config.ts';

export interface ArchivedTerm {
  term_id: number;
  name: string;
  start_date: string;
  end_date: string;
  archived: boolean;
  archived_at?: Date;
  archived_by?: number;
  archived_by_name?: string;
  archived_by_email?: string;
  total_courses?: number;
  total_applications?: number;
  total_allocations?: number;
  total_students?: number;
  total_instructors?: number;
}

export interface ArchiveLog {
  log_id?: number;
  term_id: number;
  action: 'ARCHIVED' | 'UNARCHIVED';
  archived_by: number;
  archived_at?: Date;
  notes?: string;
  metadata?: any;
}

export interface ArchiveDataSummary {
  summary_id?: number;
  term_id: number;
  total_courses: number;
  total_applications: number;
  total_allocations: number;
  total_students: number;
  total_instructors: number;
  archived_at?: Date;
}

export interface ArchiveSearchFilters {
  year?: number;
  term_name?: string;
  archived_by?: number;
  start_date?: string;
  end_date?: string;
}

export class ArchiveModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Archive a term
  async archiveTerm(termId: number, archivedBy: number, notes?: string): Promise<ArchivedTerm> {
    try {
      // Start transaction
      await this.db.query('BEGIN');

      // 1. Check if term exists and is not already archived
      const termQuery = `SELECT * FROM terms WHERE term_id = $1 AND archived = FALSE`;
      const termResult = await this.db.query(termQuery, [termId]);
      
      if (termResult.rows.length === 0) {
        throw new Error('Term not found or already archived');
      }

      const term = termResult.rows[0] as any;

      // 2. Generate summary data
      const summaryData = await this.generateArchiveSummary(termId);

      // 3. Update term as archived
      const archiveQuery = `
        UPDATE terms 
        SET archived = TRUE, archived_at = CURRENT_TIMESTAMP, archived_by = $2
        WHERE term_id = $1
        RETURNING *
      `;
      const archiveResult = await this.db.query(archiveQuery, [termId, archivedBy]);

      // 4. Insert archive log
      await this.createArchiveLog({
        term_id: termId,
        action: 'ARCHIVED',
        archived_by: archivedBy,
        notes,
        metadata: summaryData
      });

      // 5. Insert summary data
      await this.insertArchiveSummary(termId, summaryData);

      await this.db.query('COMMIT');

      // 6. Return archived term with full details
      return await this.getArchivedTermById(termId);

    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error archiving term:', error);
      throw error;
    }
  }

  // Unarchive a term (if needed)
  async unarchiveTerm(termId: number, unarchivedBy: number, notes?: string): Promise<ArchivedTerm> {
    try {
      await this.db.query('BEGIN');

      // Update term as not archived
      const query = `
        UPDATE terms 
        SET archived = FALSE, archived_at = NULL, archived_by = NULL
        WHERE term_id = $1 AND archived = TRUE
        RETURNING *
      `;
      const result = await this.db.query(query, [termId]);

      if (result.rows.length === 0) {
        throw new Error('Term not found or not archived');
      }

      // Create unarchive log
      await this.createArchiveLog({
        term_id: termId,
        action: 'UNARCHIVED',
        archived_by: unarchivedBy,
        notes
      });

      // Remove summary data
      await this.db.query('DELETE FROM archived_data_summary WHERE term_id = $1', [termId]);

      await this.db.query('COMMIT');

      return result.rows[0] as ArchivedTerm;

    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error unarchiving term:', error);
      throw error;
    }
  }

  // Get all archived terms
  async getArchivedTerms(limit: number = 50, offset: number = 0): Promise<{
    terms: ArchivedTerm[];
    total: number;
  }> {
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM terms WHERE archived = TRUE`;
    const countResult = await this.db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get archived terms
    const query = `
      SELECT * FROM archived_terms_view
      LIMIT $1 OFFSET $2
    `;
    const result = await this.db.query(query, [limit, offset]);

    return {
      terms: result.rows as ArchivedTerm[],
      total
    };
  }
/*
  // Search archived terms
  async searchArchivedTerms(filters: ArchiveSearchFilters, limit: number = 50, offset: number = 0): Promise<{
    terms: ArchivedTerm[];
    total: number;
  }> {
    let whereConditions: string[] = ['t.archived = TRUE'];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Build WHERE conditions
    if (filters.year) {
      paramCount++;
      whereConditions.push(`EXTRACT(YEAR FROM t.start_date) = $${paramCount}`);
      queryParams.push(filters.year);
    }

    if (filters.term_name) {
      paramCount++;
      whereConditions.push(`t.name ILIKE $${paramCount}`);
      queryParams.push(`%${filters.term_name}%`);
    }

    if (filters.archived_by) {
      paramCount++;
      whereConditions.push(`t.archived_by = $${paramCount}`);
      queryParams.push(filters.archived_by);
    }

    if (filters.start_date) {
      paramCount++;
      whereConditions.push(`t.archived_date >= $${paramCount}`);
      queryParams.push(filters.start_date);
    }

    if (filters.end_date) {
      paramCount++;
      whereConditions.push(`t.archived_date <= $${paramCount}`);
      queryParams.push(filters.end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM terms t 
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Main query
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        t.term_id,
        t.name,
        t.start_date,
        t.end_date,
        t.archived,
        t.archived_at,
        t.archived_by,
        u.name as archived_by_name,
        u.email as archived_by_email,
        ads.total_courses,
        ads.total_applications,
        ads.total_allocations,
        ads.total_students,
        ads.total_instructors
      FROM terms t
      LEFT JOIN users u ON t.archived_by = u.user_id
      LEFT JOIN archived_data_summary ads ON t.term_id = ads.term_id
      WHERE ${whereClause}
      ORDER BY t.archived_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    queryParams.push(limit, offset);
    const result = await this.db.query(query, queryParams);

    return {
      terms: result.rows as ArchivedTerm[],
      total
    };
  }
*/
  // Add this debug version to your ArchiveModel.searchArchivedTerms() method
async searchArchivedTerms(filters: ArchiveSearchFilters, limit: number = 50, offset: number = 0): Promise<{
  terms: ArchivedTerm[];
  total: number;
}> {
  console.log("🔍 DEBUG: searchArchivedTerms called with:");
  console.log("  - filters:", JSON.stringify(filters, null, 2));
  console.log("  - limit:", limit);
  console.log("  - offset:", offset);

  let whereConditions: string[] = ['t.archived = TRUE'];
  let queryParams: any[] = [];
  let paramCount = 0;

  // Build WHERE conditions
  if (filters.year) {
    paramCount++;
    whereConditions.push(`EXTRACT(YEAR FROM t.start_date) = $${paramCount}`);
    queryParams.push(filters.year);
    console.log(`  - Added year filter: EXTRACT(YEAR FROM t.start_date) = $${paramCount} (${filters.year})`);
  }

  if (filters.term_name) {
    paramCount++;
    whereConditions.push(`t.name ILIKE $${paramCount}`);
    queryParams.push(`%${filters.term_name}%`);
    console.log(`  - Added term_name filter: t.name ILIKE $${paramCount} (%${filters.term_name}%)`);
  }

  if (filters.archived_by) {
    paramCount++;
    whereConditions.push(`t.archived_by = $${paramCount}`);
    queryParams.push(filters.archived_by);
    console.log(`  - Added archived_by filter: t.archived_by = $${paramCount} (${filters.archived_by})`);
  }

  if (filters.start_date) {
    paramCount++;
    whereConditions.push(`t.start_date >= $${paramCount}`);
    queryParams.push(filters.start_date);
    console.log(`  - Added start_date filter: t.start_date >= $${paramCount} (${filters.start_date})`);
  }

  if (filters.end_date) {
    paramCount++;
    whereConditions.push(`t.end_date <= $${paramCount}`);
    queryParams.push(filters.end_date);
    console.log(`  - Added end_date filter: t.end_date <= $${paramCount} (${filters.end_date})`);
  }

  const whereClause = whereConditions.join(' AND ');
  console.log("🔍 Final WHERE clause:", whereClause);
  console.log("🔍 Query params:", queryParams);

  try {
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM terms t 
      WHERE ${whereClause}
    `;
    console.log("🔍 Count query:", countQuery);
    
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    console.log("🔍 Count result:", total);

    // Main query
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        t.term_id,
        t.name,
        t.start_date,
        t.end_date,
        t.archived,
        t.archived_at,
        t.archived_by,
        u.name as archived_by_name,
        u.email as archived_by_email,
        ads.total_courses,
        ads.total_applications,
        ads.total_allocations,
        ads.total_students,
        ads.total_instructors
      FROM terms t
      LEFT JOIN users u ON t.archived_by = u.user_id
      LEFT JOIN archived_data_summary ads ON t.term_id = ads.term_id
      WHERE ${whereClause}
      ORDER BY t.archived_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    queryParams.push(limit, offset);
    console.log("🔍 Main query:", query);
    console.log("🔍 Final params:", queryParams);

    const result = await this.db.query(query, queryParams);
    console.log("🔍 Query executed successfully, rows returned:", result.rows.length);

    return {
      terms: result.rows as ArchivedTerm[],
      total
    };

  } catch (error) {
    console.error("❌ SQL ERROR in searchArchivedTerms:");
    console.error("  - Error message:", error?.message);
    console.error("  - Error code:", error?.code);
    console.error("  - Error detail:", error?.detail);
    console.error("  - Error hint:", error?.hint);
    console.error("  - Full error:", error);
    throw error;
  }
}


  // Get specific archived term by ID
  async getArchivedTermById(termId: number): Promise<ArchivedTerm> {
    const query = `SELECT * FROM archived_terms_view WHERE term_id = $1`;
    const result = await this.db.query(query, [termId]);

    if (result.rows.length === 0) {
      throw new Error('Archived term not found');
    }

    return result.rows[0] as ArchivedTerm;
  }

  // Get archive logs for a term
  async getArchiveLogs(termId: number): Promise<ArchiveLog[]> {
    const query = `
      SELECT 
        al.*,
        u.name as archived_by_name,
        u.email as archived_by_email
      FROM archive_logs al
      JOIN users u ON al.archived_by = u.user_id
      WHERE al.term_id = $1
      ORDER BY al.archived_at DESC
    `;
    const result = await this.db.query(query, [termId]);
    return result.rows as ArchiveLog[];
  }

  // Get archived term data (courses, applications, etc.) - READ ONLY
  async getArchivedTermData(termId: number): Promise<{
    courses: any[];
    applications: any[];
    allocations: any[];
  }> {
    // Verify term is archived
    const termQuery = `SELECT archived FROM terms WHERE term_id = $1`;
    const termResult = await this.db.query(termQuery, [termId]);
    
    if (termResult.rows.length === 0) {
      throw new Error('Term not found');
    }

    if (!termResult.rows[0].archived) {
      throw new Error('Term is not archived');
    }

    // Get term name for course filtering
    const termNameQuery = `SELECT name FROM terms WHERE term_id = $1`;
    const termNameResult = await this.db.query(termNameQuery, [termId]);
    const termName = termNameResult.rows[0].name;

    // Get courses for this term
    const coursesQuery = `
      SELECT 
        c.*,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.user_id
      WHERE c.term = $1
      ORDER BY c.code
    `;
    const coursesResult = await this.db.query(coursesQuery, [termName]);

    // Get applications from this term (based on submission date during term period)
    const applicationsQuery = `
      SELECT 
        ta.*,
        u.name as applicant_name,
        u.email as applicant_email
      FROM ta_applications ta
      JOIN users u ON ta.user_id = u.user_id
      JOIN terms t ON ta.submitted_at BETWEEN t.start_date AND t.end_date
      WHERE t.term_id = $1
      ORDER BY ta.submitted_at DESC
    `;
    const applicationsResult = await this.db.query(applicationsQuery, [termId]);

    // Get allocations for courses in this term
    const courseIds = coursesResult.rows.map(course => course.course_id);
    let allocationsResult = { rows: [] };
    
    if (courseIds.length > 0) {
      const allocationsQuery = `
        SELECT 
          alloc.*,
          u.name as student_name,
          u.email as student_email,
          c.code as course_code,
          c.title as course_title,
          ls.section_name
        FROM ta_allocations alloc
        JOIN users u ON alloc.user_id = u.user_id
        JOIN lab_sections ls ON alloc.lab_section_id = ls.lab_section_id
        JOIN courses c ON ls.course_id = c.course_id
        WHERE c.course_id = ANY($1)
        ORDER BY alloc.allocated_at DESC
      `;
      allocationsResult = await this.db.query(allocationsQuery, [courseIds]);
    }

    return {
      courses: coursesResult.rows,
      applications: applicationsResult.rows,
      allocations: allocationsResult.rows
    };
  }

  // Helper: Generate archive summary
  private async generateArchiveSummary(termId: number): Promise<ArchiveDataSummary> {
    // Get term name
    const termQuery = `SELECT name FROM terms WHERE term_id = $1`;
    const termResult = await this.db.query(termQuery, [termId]);
    const termName = termResult.rows[0].name;

    // Count courses
    const coursesQuery = `SELECT COUNT(*) as count FROM courses WHERE term = $1`;
    const coursesResult = await this.db.query(coursesQuery, [termName]);
    const totalCourses = parseInt(coursesResult.rows[0].count);

    // Count applications (submitted during term period)
    const applicationsQuery = `
      SELECT COUNT(*) as count 
      FROM ta_applications ta
      JOIN terms t ON ta.submitted_at BETWEEN t.start_date AND t.end_date
      WHERE t.term_id = $1
    `;
    const applicationsResult = await this.db.query(applicationsQuery, [termId]);
    const totalApplications = parseInt(applicationsResult.rows[0].count);

    // Count allocations
    const allocationsQuery = `
      SELECT COUNT(*) as count 
      FROM ta_allocations alloc
      JOIN lab_sections ls ON alloc.lab_section_id = ls.lab_section_id
      JOIN courses c ON ls.course_id = c.course_id
      WHERE c.term = $1
    `;
    const allocationsResult = await this.db.query(allocationsQuery, [termName]);
    const totalAllocations = parseInt(allocationsResult.rows[0].count);

    // Count unique students who applied
    const studentsQuery = `
      SELECT COUNT(DISTINCT ta.user_id) as count 
      FROM ta_applications ta
      JOIN terms t ON ta.submitted_at BETWEEN t.start_date AND t.end_date
      WHERE t.term_id = $1
    `;
    const studentsResult = await this.db.query(studentsQuery, [termId]);
    const totalStudents = parseInt(studentsResult.rows[0].count);

    // Count unique instructors
    const instructorsQuery = `
      SELECT COUNT(DISTINCT c.instructor_id) as count 
      FROM courses c
      WHERE c.term = $1 AND c.instructor_id IS NOT NULL
    `;
    const instructorsResult = await this.db.query(instructorsQuery, [termName]);
    const totalInstructors = parseInt(instructorsResult.rows[0].count);

    return {
      term_id: termId,
      total_courses: totalCourses,
      total_applications: totalApplications,
      total_allocations: totalAllocations,
      total_students: totalStudents,
      total_instructors: totalInstructors
    };
  }

  // Helper: Create archive log
  private async createArchiveLog(log: Omit<ArchiveLog, 'log_id' | 'archived_at'>): Promise<void> {
    const query = `
      INSERT INTO archive_logs (term_id, action, archived_by, notes, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await this.db.query(query, [
      log.term_id,
      log.action,
      log.archived_by,
      log.notes || null,
      log.metadata ? JSON.stringify(log.metadata) : null
    ]);
  }

  // Helper: Insert archive summary
  private async insertArchiveSummary(termId: number, summary: ArchiveDataSummary): Promise<void> {
    const query = `
      INSERT INTO archived_data_summary (
        term_id, total_courses, total_applications, total_allocations, 
        total_students, total_instructors
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (term_id) DO UPDATE SET
        total_courses = EXCLUDED.total_courses,
        total_applications = EXCLUDED.total_applications,
        total_allocations = EXCLUDED.total_allocations,
        total_students = EXCLUDED.total_students,
        total_instructors = EXCLUDED.total_instructors,
        archived_at = CURRENT_TIMESTAMP
    `;
    await this.db.query(query, [
      termId,
      summary.total_courses,
      summary.total_applications,
      summary.total_allocations,
      summary.total_students,
      summary.total_instructors
    ]);
  }
}
