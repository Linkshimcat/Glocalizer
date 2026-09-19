export interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  naver_id: string | null;
  supabase_auth_id: string | null;
  signup_method: 'email' | 'naver' | 'google';
  name: string | null;
  avatar_url: string | null;
  name_customized: boolean;
  avatar_customized: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  signupMethod: 'email' | 'naver' | 'google';
}
