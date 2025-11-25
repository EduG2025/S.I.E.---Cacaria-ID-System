import { Resident, SystemUser, AssociationData } from '@/types';

// Detect API URL: Development (localhost:3001) vs Production (Relative /api)
// Note: In some preview environments, localhost:3001 might not be directly accessible, triggering the fallback.
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// --- FALLBACK STORAGE KEYS ---
const STORAGE_KEYS = {
    RESIDENTS: 'sie_residents_db',
    USERS: 'sie_users_db',
    SETTINGS: 'sie_settings_db',
    ROLES: 'sie_roles_db'
};

// --- LOCAL STORAGE HELPERS ---
const localDB = {
    get: (key: string) => JSON.parse(localStorage.getItem(key) || '[]'),
    set: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
    getObj: (key: string) => JSON.parse(localStorage.getItem(key) || 'null'),
};

/**
 * Hybrid Fetch Function
 * Tries to fetch from the Node.js Backend. 
 * If it fails (Network Error, 404, or non-JSON response), it executes the fallbackFn (LocalStorage).
 */
async function fetchWithFallback<T>(
    endpoint: string, 
    options: RequestInit | undefined, 
    fallbackFn: () => Promise<T> | T
): Promise<T> {
    try {
        // Create a timeout signal to fail fast if backend is not running
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get("content-type");
        
        // If success and is JSON
        if (res.ok && contentType && contentType.includes("application/json")) {
            return await res.json();
        } else {
            // Force error to trigger fallback
            throw new Error(`Backend unavailable or invalid response for ${endpoint}`);
        }
    } catch (err) {
        // Silently fail over to LocalStorage so the user doesn't see an error
        // console.warn(`API ${endpoint} failed, using LocalStorage fallback.`);
        return await fallbackFn();
    }
}

export const api = {
    // --- System Health ---
    async checkBackendConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            
            // Tenta acessar a rota de health check (precisa ser definida no server.js)
            // Se falhar, tenta listar roles como proxy de saúde
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

    async saveResident(resident: Resident): Promise<void> {
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
        });
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
            // Hardcoded fallback admin
            if (username === 'admin' && password === 'admin') {
                return { id: '1', name: 'Administrador', username: 'admin', role: 'ADMIN' } as SystemUser;
            }
            // Check local users
            const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
            const found = users.find(u => u.username === username && u.password === password);
            return found || null;
        });
    },

    async getUsers(): Promise<SystemUser[]> {
        return fetchWithFallback('/users', undefined, () => {
            const users = localDB.get(STORAGE_KEYS.USERS) as SystemUser[];
            // Ensure at least one admin exists in local storage
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

    async saveSettings(data: AssociationData, logo: string | null): Promise<void> {
        return fetchWithFallback('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, logo })
        }, () => {
             localDB.set(STORAGE_KEYS.SETTINGS, { data, logo });
        });
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
    }
};