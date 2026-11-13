import api, { initializeCsrfCookie } from "./client";

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
  const response = await api.get<{ data: AuthUser }>("/user");
  return response.data.data;
}

export async function updateUserProfile(input: ProfileUpdateInput): Promise<AuthUser> {
  const response = await api.put<{ data: AuthUser }>("/user", input);
  return response.data.data;
}

export async function changeUserPassword(input: PasswordChangeInput): Promise<void> {
  await api.put("/user/password", input);
}

export async function registerUser(input: RegistrationInput): Promise<AuthUser> {
  await initializeCsrfCookie();
  const response = await api.post<{ data: AuthUser }>("/register", input);
  return response.data.data;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  await initializeCsrfCookie();
  const response = await api.post<{ data: AuthUser }>("/login", input);
  return response.data.data;
}

export async function logoutUser(): Promise<void> {
  await initializeCsrfCookie();
  await api.post("/logout");
}
