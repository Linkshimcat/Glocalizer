import { findProjectsByOwner } from '../repositories/project.repository.js';
import { listLoginHistory } from '../repositories/session.repository.js';
import type { LoginMethod } from '../types/session.js';
import { getCurrentUser } from './auth.service.js';
import { listPayments } from './payment.service.js';

const LOGIN_HISTORY_LIMIT = 20;
const EXPORT_LOGIN_HISTORY_LIMIT = 100;

export interface AccountSummary {
  projectCount: number;
  completedProjectCount: number;
  lastActivityAt: string | null;
}

export interface PublicLoginRecord {
  id: string;
  deviceLabel: string | null;
  ipMasked: string | null;
  loginMethod: LoginMethod;
  createdAt: string;
  /** 지금 이 기기에서 쓰는 세션. */
  current: boolean;
  /** 아직 유효한 세션이면 true, 로그아웃·만료됐으면 false. */
  active: boolean;
}

export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  const projects = await findProjectsByOwner(userId);
  return {
    projectCount: projects.length,
    completedProjectCount: projects.filter(project => project.result_ready).length,
    // 목록은 updated_at 내림차순이라 첫 행이 가장 최근이다.
    lastActivityAt: projects[0]?.updated_at ?? null,
  };
}

async function loginRecords(userId: string, currentSid: string | undefined, limit: number): Promise<PublicLoginRecord[]> {
  const rows = await listLoginHistory(userId, limit);
  const now = Date.now();
  return rows.map(row => ({
    id: row.id,
    deviceLabel: row.device_label,
    ipMasked: row.ip_masked,
    loginMethod: row.login_method,
    createdAt: row.created_at,
    current: row.id === currentSid,
    active: !row.revoked_at && new Date(row.expires_at).getTime() > now,
  }));
}

export function getLoginHistory(userId: string, currentSid: string | undefined): Promise<PublicLoginRecord[]> {
  return loginRecords(userId, currentSid, LOGIN_HISTORY_LIMIT);
}

/** 개인정보 열람·이전 요청에 쓰는 내 데이터 사본. 이미지 파일은 포함하지 않고 메타데이터만 담는다. */
export async function exportAccountData(userId: string, currentSid: string | undefined) {
  const [profile, projects, loginHistory, payments] = await Promise.all([
    getCurrentUser(userId),
    findProjectsByOwner(userId),
    loginRecords(userId, currentSid, EXPORT_LOGIN_HISTORY_LIMIT),
    listPayments(userId, 100),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: { ...profile, avatarUrl: profile.avatarUrl ? '(profile image omitted)' : null },
    projects: projects.map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      resultReady: project.result_ready ?? false,
      targetLanguages: project.target_languages,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    })),
    loginHistory,
    payments,
  };
}
