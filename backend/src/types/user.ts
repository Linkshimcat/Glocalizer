export interface UserRow {
  id: string;
  session_version: number;
  deleting_at?: string | null;
  email: string | null;
  password_hash: string | null;
  naver_id: string | null;
  kakao_id: string | null;
  supabase_auth_id: string | null;
  signup_method: 'email' | 'naver' | 'google' | 'kakao';
  name: string | null;
  avatar_url: string | null;
  name_customized: boolean;
  avatar_customized: boolean;
  membership_plan: string | null;
  membership_expires_at: string | null;
  security_email_notifications: boolean;
  /** 종류별 보안 메일 수신 여부. 마이그레이션 적용 전 행에는 없을 수 있어 없으면 켜진 것으로 본다. */
  security_email_new_device?: boolean;
  security_email_password_changed?: boolean;
  security_email_sessions_revoked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  signupMethod: 'email' | 'naver' | 'google' | 'kakao';
  hasPassword: boolean;
  hasNaver: boolean;
  hasGoogle: boolean;
  hasKakao: boolean;
  membershipPlan: string | null;
  membershipExpiresAt: string | null;
  securityEmailNotifications: boolean;
  securityEmailTypes: SecurityEmailTypes;
  createdAt: string;
}

export interface SecurityEmailTypes {
  newDeviceLogin: boolean;
  passwordChanged: boolean;
  otherSessionsSignedOut: boolean;
}
