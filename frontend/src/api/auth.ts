import api from "./client";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  name: string;
  email: string;
}

export interface PasswordChangeInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get<{ data: AuthUser }>("/api/user");
  return response.data.data;
}

export async function updateUserProfile(input: ProfileUpdateInput): Promise<AuthUser> {
  const response = await api.put<{ data: AuthUser }>("/api/user", input);
  return response.data.data;
}

export async function changeUserPassword(input: PasswordChangeInput): Promise<void> {
  await api.put("/api/user/password", input);
}

export async function registerUser(input: RegistrationInput): Promise<AuthUser> {
  await api.get("/sanctum/csrf-cookie");
  const response = await api.post<{ data: AuthUser }>("/api/register", input);
  return response.data.data;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  await api.get("/sanctum/csrf-cookie");
  const response = await api.post<{ data: AuthUser }>("/api/login", input);
  return response.data.data;
}

export async function logoutUser(): Promise<void> {
  await api.get("/sanctum/csrf-cookie");
  await api.post("/api/logout");
}
