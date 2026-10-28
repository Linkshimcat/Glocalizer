export type LoginMethod = 'email' | 'naver' | 'google' | 'kakao';

export interface SessionRow {
  id: string;
  user_id: string;
  login_method: LoginMethod;
  user_agent: string | null;
  device_label: string | null;
  ip_masked: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface PublicSession {
  id: string;
  deviceLabel: string | null;
  ipMasked: string | null;
  loginMethod: LoginMethod;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
  /** 기기별 세션 도입 이전 토큰으로 로그인된 현재 기기. 개별 폐기 대상이 아니다. */
  legacy?: boolean;
}

/** 로그인 요청에서 가져오는 기기 정보. 원본 IP는 저장하지 않고 마스킹해서 쓴다. */
export interface SessionContext {
  userAgent?: string;
  ip?: string;
  deviceId?: string;
}
