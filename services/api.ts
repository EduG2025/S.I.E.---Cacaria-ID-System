import { Resident, SystemUser, AssociationData, CustomTemplate, ApiKey } from '@/types';

// Detect API URL
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// --- FALLBACK STORAGE KEYS ---
const STORAGE_KEYS = {
    RESIDENTS: 'sie_residents_db',
    USERS: 'sie_users_db',
    SETTINGS: 'sie_settings_db',
    ROLES: 'sie_roles_db',
    TEMPLATES: 'sie_templates_db',
    API_KEYS: 'sie_api_keys_db'
};

// --- LOCAL STORAGE HELPERS (ROBUST) ---
const localDB = {
    get: (key: string) => {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            console.warn(`Corrupted local data for ${key}, resetting.`);
            return [];
        }
    },
    set: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
    getObj: (key: string) => {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null');
        } catch (e) {
            return null;
        }
    },
};

export interface SaveResult {
    success: boolean;
    offline: boolean;
}

/**
 * Hybrid Fetch Function
 */
async function fetchWithFallback<T>(
    endpoint: string, 
    options: RequestInit | undefined, 
    fallbackFn: () => Promise<T> | T
): Promise<T & { _offline?: boolean }> {
    try {
        const controller = new AbortController();
        // FIX: Increased timeout to 15000ms (15s) to handle large image uploads/edits
        const timeoutId = setTimeout(() => controller.abort(), 15000); 

        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get("content-type");
        
        if (res.ok && contentType && contentType.includes("application/json")) {
            const data = await res.json();
            return { ...data, _offline: false };
        } else {
            // If server returns 404 or 500, throws to trigger fallback
            throw new Error(`Backend unavailable or invalid response for ${endpoint}`);
        }
    } catch (err) {
        console.warn(`API Error on ${endpoint}:`, err);
        const fallbackData = await fallbackFn();
        // @ts-ignore
        return { ...fallbackData, _offline: true };
    }
}

export const api = {
    // --- System Health ---
    async checkBackendConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''}/health`, { 
                method: 'GET',
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            return false;
        }
    },
    
    // --- Residents ---
    async getResidents(): Promise<Resident[]> {
        return fetchWithFallback('/residents', undefined, () => {
            return localDB.get(STORAGE_KEYS.RESIDENTS);
        });
    },

    async saveResident(resident: Resident): Promise<SaveResult> {
        // @ts-ignore
        return fetchWithFallback('/residents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resident)
        }, () => {
            const list = localDB.get(STORAGE_KEYS.RESIDENTS) as Resident[];
            const index = list.findIndex(r => r.id === resident.id);
            if (index >= 0) list[index] = resident;
            else list.push(resident);
            localDB.set(STORAGE_KEYS.RESIDENTS, list);
            return { success: true };
        }).then(res => ({ success: true, offline: !!res._offline }));
    },

    async deleteResident(id: string): Promise<void> {
        return fetchWithFallback(`/residents/${id}`, { method: 'DELETE' }, () => {
            const list = localDB.get(STORAGE_KEYS.RESIDENTS) as Resident[];
            localDB.set(STORAGE_KEYS.RESIDENTS, list.filter(r => r.id !== id));
        });
    },

    // --- Users ---
    async login(username: string, password: string): Promise<SystemUser | null> {
        return fetchWithFallback('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }, () => {
            if (username === 'admin' && password === 'admin') {
                return { id: '1', name: 'Administrador', username: 'admin', role: 'ADMIN' } as SystemUser;
            }
            const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
            const found = users.find(u => u.username === username && u.password === password);
            return found || null;
        });
    },

    async getUsers(): Promise<SystemUser[]> {
        return fetchWithFallback('/users', undefined, () => {
            const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
            if (users.length === 0) {
                 return [{ id: '1', name: 'Administrador', username: 'admin', role: 'ADMIN' }];
            }
            return users;
        });
    },

    async createUser(user: SystemUser): Promise<void> {
        return fetchWithFallback('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        }, () => {
             const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
             users.push(user);
             localDB.set(STORAGE_KEYS.USERS, users);
        });
    },

    async deleteUser(id: string): Promise<void> {
        return fetchWithFallback(`/users/${id}`, { method: 'DELETE' }, () => {
            const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
            localDB.set(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
        });
    },

    // --- Settings ---
    async getSettings(): Promise<{ data: AssociationData | null, logo: string | null }> {
        return fetchWithFallback('/settings', undefined, () => {
            const stored = localDB.getObj(STORAGE_KEYS.SETTINGS);
            return stored || { data: null, logo: null };
        });
    },

    async saveSettings(data: AssociationData, logo: string | null): Promise<SaveResult> {
        // @ts-ignore
        return fetchWithFallback('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, logo })
        }, () => {
             localDB.set(STORAGE_KEYS.SETTINGS, { data, logo });
             return { success: true };
        }).then(res => ({ success: true, offline: !!res._offline }));
    },

    // --- Roles ---
    async getRoles(): Promise<string[]> {
        return fetchWithFallback('/roles', undefined, () => {
            return localDB.get(STORAGE_KEYS.ROLES);
        });
    },

    async addRole(name: string): Promise<void> {
        return fetchWithFallback('/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }, () => {
            const roles = localDB.get(STORAGE_KEYS.ROLES) as string[];
            if(!roles.includes(name)) {
                roles.push(name);
                localDB.set(STORAGE_KEYS.ROLES, roles);
            }
        });
    },

    // --- Templates ---
    async getTemplates(): Promise<CustomTemplate[]> {
        return fetchWithFallback('/templates', undefined, () => {
            return localDB.get(STORAGE_KEYS.TEMPLATES);
        });
    },

    async saveTemplate(template: CustomTemplate): Promise<SaveResult> {
        // @ts-ignore
        return fetchWithFallback('/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
        }, () => {
            const list = localDB.get(STORAGE_KEYS.TEMPLATES) as CustomTemplate[];
            const index = list.findIndex(t => t.id === template.id);
            if (index >= 0) list[index] = template;
            else list.push(template);
            localDB.set(STORAGE_KEYS.TEMPLATES, list);
            return { success: true };
        }).then(res => ({ success: true, offline: !!res._offline }));
    },

    async deleteTemplate(id: string): Promise<void> {
        return fetchWithFallback(`/templates/${id}`, { method: 'DELETE' }, () => {
            const list = localDB.get(STORAGE_KEYS.TEMPLATES) as CustomTemplate[];
            localDB.set(STORAGE_KEYS.TEMPLATES, list.filter(t => t.id !== id));
        });
    },

    // --- API KEYS MANAGEMENT ---
    async getApiKeys(): Promise<ApiKey[]> {
        return fetchWithFallback('/keys', undefined, () => {
            return localDB.get(STORAGE_KEYS.API_KEYS);
        });
    },

    async addApiKey(keyData: ApiKey): Promise<SaveResult> {
        // @ts-ignore
        return fetchWithFallback('/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(keyData)
        }, () => {
            const keys = localDB.get(STORAGE_KEYS.API_KEYS) as ApiKey[];
            if (keyData.isActive) {
                keys.forEach(k => k.isActive = false);
            }
            keys.push(keyData);
            localDB.set(STORAGE_KEYS.API_KEYS, keys);
            return { success: true };
        }).then(res => ({ success: true, offline: !!res._offline }));
    },

    async updateApiKeyStatus(id: string, isActive: boolean): Promise<void> {
        return fetchWithFallback(`/keys/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive })
        }, () => {
            const keys = localDB.get(STORAGE_KEYS.API_KEYS) as ApiKey[];
            if (isActive) {
                keys.forEach(k => k.isActive = false);
            }
            const target = keys.find(k => k.id === id);
            if (target) target.isActive = isActive;
            localDB.set(STORAGE_KEYS.API_KEYS, keys);
        });
    },

    async deleteApiKey(id: string): Promise<void> {
        return fetchWithFallback(`/keys/${id}`, { method: 'DELETE' }, () => {
             const keys = localDB.get(STORAGE_KEYS.API_KEYS) as ApiKey[];
             localDB.set(STORAGE_KEYS.API_KEYS, keys.filter(k => k.id !== id));
        });
    },

    async getActiveApiKey(): Promise<string | null> {
        return fetchWithFallback('/keys/active', undefined, () => {
             const keys = localDB.get(STORAGE_KEYS.API_KEYS) as ApiKey[];
             return keys.find(k => k.isActive)?.key || null;
        }).then((data: any) => data.key || data).catch(() => null);
    }
};
