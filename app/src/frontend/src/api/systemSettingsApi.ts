const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

const fetchConfig = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include" as const,
};

export interface SystemSetting {
  id: string;
  category: string;
  name: string;
  value: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'date';
}

export interface SystemSettingsResponse {
  settings: SystemSetting[];
}

export interface UpdateSettingRequest {
  value: string;
}

export interface UpdateSettingResponse {
  message: string;
  setting: SystemSetting;
}

/**
 * Get all system settings (admin only)
 */
export const getSystemSettings = async (): Promise<SystemSettingsResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/system-settings`, {
    ...fetchConfig,
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch system settings: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Update a specific system setting by key (admin only)
 */
export const updateSystemSetting = async (key: string, value: string): Promise<UpdateSettingResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/system-settings/${key}`, {
    ...fetchConfig,
    method: "PUT",
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update system setting: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get settings by category (admin only)
 */
export const getSystemSettingsByCategory = async (category: string): Promise<SystemSettingsResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/system-settings/category/${category}`, {
    ...fetchConfig,
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to fetch settings by category: ${response.statusText}`);
  }

  return response.json();
};

// Export as default API object
export const systemSettingsApi = {
  getSettings: getSystemSettings,
  updateSetting: updateSystemSetting,
  getSettingsByCategory: getSystemSettingsByCategory,
}; 