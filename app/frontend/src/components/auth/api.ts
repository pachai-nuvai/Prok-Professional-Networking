const API_URL = 'http://localhost:5000';

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message?: string;
  user?: { id: number; username: string; email: string };
  access_token?: string;
  error?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const body: Record<string, string> = { password: credentials.password };
    if (credentials.email) body.email = credentials.email;
    else if (credentials.username) body.username = credentials.username;
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  },

  signup: async (userData: SignupData): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  },
};
