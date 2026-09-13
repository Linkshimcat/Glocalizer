export interface UserRow {
  id: string;
  email: string | null;
  password_hash: string | null;
  naver_id: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}
