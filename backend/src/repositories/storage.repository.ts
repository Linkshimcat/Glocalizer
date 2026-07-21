import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { unwrapVoid } from '../utils/db-result.js';

export async function downloadFromStorage(path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadToStorage(path: string, buffer: Buffer, contentType: string): Promise<void> {
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new AppError('IMAGE_CLEANUP_FAILED', { cause: error.message }, '정리된 이미지를 저장하지 못했습니다.');
  }
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1시간

export async function createSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function removeFromStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const result = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(paths);
  unwrapVoid(result, '스토리지 파일 삭제에 실패했습니다.');
}
