import { Database } from "../config.ts";

export interface SystemSetting {
  setting_id?: number;
  key: string;
  value: string;
  description?: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  category: string;
  created_at?: Date;
  updated_at?: Date;
}

export class SystemSettingsModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Get all system settings
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    const query = `
      SELECT setting_id, key, value, description, type, category, created_at, updated_at
      FROM system_settings
      ORDER BY category, key
    `;
    
    const result = await this.db.query<SystemSetting>(query);
    return result.rows;
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    const query = `
      SELECT setting_id, key, value, description, type, category, created_at, updated_at
      FROM system_settings
      WHERE category = $1
      ORDER BY key
    `;
    
    const result = await this.db.query<SystemSetting>(query, [category]);
    return result.rows;
  }

  /**
   * Get a specific setting by key
   */
  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    const query = `
      SELECT setting_id, key, value, description, type, category, created_at, updated_at
      FROM system_settings
      WHERE key = $1
    `;
    
    const result = await this.db.query<SystemSetting>(query, [key]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update a setting by key
   */
  async updateSetting(key: string, value: string): Promise<SystemSetting | null> {
    const query = `
      UPDATE system_settings
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = $2
      RETURNING setting_id, key, value, description, type, category, created_at, updated_at
    `;
    
    const result = await this.db.query<SystemSetting>(query, [value, key]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create a new setting
   */
  async createSetting(setting: Omit<SystemSetting, 'setting_id' | 'created_at' | 'updated_at'>): Promise<SystemSetting> {
    const query = `
      INSERT INTO system_settings (key, value, description, type, category)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING setting_id, key, value, description, type, category, created_at, updated_at
    `;
    
    const result = await this.db.query<SystemSetting>(query, [
      setting.key,
      setting.value,
      setting.description || null,
      setting.type,
      setting.category
    ]);
    
    return result.rows[0];
  }

  /**
   * Delete a setting by key
   */
  async deleteSetting(key: string): Promise<boolean> {
    const query = `DELETE FROM system_settings WHERE key = $1`;
    const result = await this.db.query(query, [key]);
    return result.rowCount > 0;
  }

  /**
   * Check if current date is past a deadline setting
   */
  async isDeadlinePassed(deadlineKey: string): Promise<boolean> {
    const setting = await this.getSettingByKey(deadlineKey);
    if (!setting || setting.type !== 'date') {
      return false;
    }

    const deadlineDate = new Date(setting.value);
    const currentDate = new Date();
    
    // Reset time to compare only dates
    deadlineDate.setHours(23, 59, 59, 999);
    currentDate.setHours(0, 0, 0, 0);
    
    return currentDate > deadlineDate;
  }

  /**
   * Get deadline date for a specific deadline key
   */
  async getDeadlineDate(deadlineKey: string): Promise<Date | null> {
    const setting = await this.getSettingByKey(deadlineKey);
    if (!setting || setting.type !== 'date') {
      return null;
    }

    return new Date(setting.value);
  }
} 