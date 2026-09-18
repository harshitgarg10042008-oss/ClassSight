const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
let token = '';
export function setToken(value: string) { token = value; }
export function apiBase() { return API; }
export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response;
}
export async function csrf() { return api('/csrf').then(response => response.json() as Promise<{ token: string }>); }
