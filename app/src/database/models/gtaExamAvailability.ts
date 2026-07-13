// NEW FILE: Model for managing GTA exam period availability

import { Database } from '../config.ts';

export interface GTAExamAvailability {
  availability_id?: number;
  user_id: number;
  term_id?: number;
  start_date: string; // Format: YYYY-MM-DD
  end_date: string;   // Format: YYYY-MM-DD
  notes?: string;
  is_single_day?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface AvailabilityConflict {
  availability_1: number;
  availability_2: number;
  user_id: number;
  start_1: string;
  end_1: string;
  start_2: string;
  end_2: string;
  term_id?: number;
}

/**
 * Model for managing GTA exam period availability
 * Handles CRUD operations and conflict detection
 */
export class GTAExamAvailabilityModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Create new availability period for a GTA
   * Automatically detects if it's a single day (start_date === end_date)
   */
  async createAvailability(availability: Omit<GTAExamAvailability, 'availability_id' | 'created_at' | 'updated_at'>): Promise<GTAExamAvailability> {
    // Check if it's a single day
    const isSingleDay = availability.start_date === availability.end_date;
    
    const query = `
      INSERT INTO gta_exam_availability (
        user_id, term_id, start_date, end_date, notes, is_single_day
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await this.db.query<GTAExamAvailability>(query, [
      availability.user_id,
      availability.term_id || null,
      availability.start_date,
      availability.end_date,
      availability.notes || null,
      isSingleDay
    ]);
    
    return result.rows[0];
  }

  /**
   * Get all availability periods for a specific GTA
   * Optionally filter by term
   */
  async getAvailabilityByUser(userId: number, termId?: number): Promise<GTAExamAvailability[]> {
    let query = `
      SELECT 
        gea.*,
        t.name as term_name
      FROM gta_exam_availability gea
      LEFT JOIN terms t ON gea.term_id = t.term_id
      WHERE gea.user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (termId !== undefined) {
      query += ` AND gea.term_id = $2`;
      params.push(termId);
    }
    
    query += ` ORDER BY gea.start_date ASC`;
    
    const result = await this.db.query<GTAExamAvailability>(query, params);
    return result.rows;
  }

  /**
   * Get availability by ID
   */
  async getAvailabilityById(availabilityId: number): Promise<GTAExamAvailability | null> {
    const query = `
      SELECT gea.*, t.name as term_name
      FROM gta_exam_availability gea
      LEFT JOIN terms t ON gea.term_id = t.term_id
      WHERE gea.availability_id = $1
    `;
    
    const result = await this.db.query<GTAExamAvailability>(query, [availabilityId]);
    return result.rows[0] || null;
  }

  /**
   * Update existing availability period
   */
  async updateAvailability(availabilityId: number, updates: Partial<GTAExamAvailability>): Promise<GTAExamAvailability | null> {
    const fields = Object.keys(updates).filter(key => 
      key !== 'availability_id' && key !== 'created_at' && key !== 'updated_at'
    );
    
    if (fields.length === 0) return null;

    // Check if dates are being updated to determine if it's single day
    if (updates.start_date || updates.end_date) {
      const current = await this.getAvailabilityById(availabilityId);
      if (current) {
        const startDate = updates.start_date || current.start_date;
        const endDate = updates.end_date || current.end_date;
        updates.is_single_day = startDate === endDate;
      }
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE gta_exam_availability 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE availability_id = $1
      RETURNING *
    `;
    
    const values = [availabilityId, ...fields.map(field => (updates as any)[field])];
    const result = await this.db.query<GTAExamAvailability>(query, values);
    
    return result.rows[0] || null;
  }

  /**
   * Delete availability period
   */
  async deleteAvailability(availabilityId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM gta_exam_availability 
      WHERE availability_id = $1 AND user_id = $2
    `;
    
    const result = await this.db.query(query, [availabilityId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Check for conflicts with existing availability periods
   * Returns any overlapping periods for the same user in the same term
   */
  async checkConflicts(userId: number, startDate: string, endDate: string, termId?: number, excludeId?: number): Promise<GTAExamAvailability[]> {
    let query = `
      SELECT * FROM gta_exam_availability 
      WHERE user_id = $1 
      AND (
        (start_date <= $3 AND end_date >= $2)
      )
    `;
    
    const params: any[] = [userId, startDate, endDate];
    let paramIndex = 4;
    
    if (termId !== undefined) {
      query += ` AND term_id = $${paramIndex}`;
      params.push(termId);
      paramIndex++;
    }
    
    if (excludeId !== undefined) {
      query += ` AND availability_id != $${paramIndex}`;
      params.push(excludeId);
    }
    
    const result = await this.db.query<GTAExamAvailability>(query, params);
    return result.rows;
  }

  /**
   * Get all GTAs available during a specific date range
   * Useful for coordinators to see who's available for exam duties
   */
  async getAvailableGTAs(startDate: string, endDate: string, termId?: number): Promise<any[]> {
    let query = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        gea.start_date,
        gea.end_date,
        gea.notes,
        gea.is_single_day,
        gea.availability_id,
        t.name as term_name
      FROM gta_exam_availability gea
      JOIN users u ON gea.user_id = u.user_id
      LEFT JOIN terms t ON gea.term_id = t.term_id
      WHERE u.role = 'student'
      AND (
        (gea.start_date <= $2 AND gea.end_date >= $1)
      )
    `;
    
    const params: any[] = [startDate, endDate];
    
    if (termId !== undefined) {
      query += ` AND gea.term_id = $3`;
      params.push(termId);
    }
    
    query += ` ORDER BY u.name ASC, gea.start_date ASC`;
    
    const result = await this.db.query<any>(query, params);
    return result.rows;
  }

  /**
   * Get availability summary for a term
   * Shows how many GTAs are available on each date
   */
  async getAvailabilitySummary(termId?: number): Promise<any[]> {
    let query = `
      SELECT 
        date_trunc('day', generate_series(gea.start_date, gea.end_date, '1 day')) as date,
        COUNT(DISTINCT gea.user_id) as available_gtas,
        array_agg(DISTINCT u.name ORDER BY u.name) as gta_names
      FROM gta_exam_availability gea
      JOIN users u ON gea.user_id = u.user_id
      WHERE u.role = 'student'
    `;
    
    const params: any[] = [];
    
    if (termId !== undefined) {
      query += ` AND gea.term_id = $1`;
      params.push(termId);
    }
    
    query += `
      GROUP BY date
      ORDER BY date ASC
    `;
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Bulk update/create availability for a user
   * Replaces all existing availability for a term with new data
   */
  async replaceUserAvailability(userId: number, termId: number, availabilities: Omit<GTAExamAvailability, 'availability_id' | 'user_id' | 'term_id' | 'created_at' | 'updated_at'>[]): Promise<GTAExamAvailability[]> {
    // Start transaction
    const results: GTAExamAvailability[] = [];
    
    try {
      // Delete existing availability for this term
      await this.db.query(
        `DELETE FROM gta_exam_availability WHERE user_id = $1 AND term_id = $2`,
        [userId, termId]
      );
      
      // Insert new availability periods
      for (const availability of availabilities) {
        const created = await this.createAvailability({
          ...availability,
          user_id: userId,
          term_id: termId
        });
        results.push(created);
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk availability update:', error);
      throw error;
    }
  }
}