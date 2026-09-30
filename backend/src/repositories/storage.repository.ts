import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { unwrapVoid } from '../utils/db-result.js';

interface StorageDownloadCache {
  directory: string;
  files: Map<string, Promise<string | Buffer | null>>;
}

const storageDownloadCache = new AsyncLocalStorage<StorageDownloadCache>();

export async function withStorageDownloadCache<T>(work: () => Promise<T>): Promise<T> {
  let directory: string;
  try {
    directory = await mkdtemp(join(tmpdir(), 'glocalizer-storage-'));
  } catch {
    return work();
  }

  try {
    return await storageDownloadCache.run({ directory, files: new Map() }, work);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function downloadFromStorage(path: string): Promise<Buffer | null> {
  const cache = storageDownloadCache.getStore();
  if (cache) {
    let file = cache.files.get(path);
    if (!file) {
      file = (async () => {
        const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(path);
        if (error || !data) return null;
        const buffer = Buffer.from(await data.arrayBuffer());
        const filePath = join(cache.directory, randomUUID());
        try {
          await writeFile(filePath, buffer, { flag: 'wx' });
          return filePath;
        } catch {
          return buffer;
        }
      })();
      cache.files.set(path, file);
    }

    const cachedFile = await file;
    if (!cachedFile) return null;
    if (Buffer.isBuffer(cachedFile)) return Buffer.from(cachedFile);
    try {
      return await readFile(cachedFile);
    } catch {
      cache.files.delete(path);
      return downloadFromStorage(path);
    }
  }

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

export function thumbnailPathForOriginal(path: string): string {
  return path.replace('/original/', '/thumbnail/').replace(/\.[^/.]+$/, '.webp');
}

export async function uploadThumbnailForOriginal(path: string, buffer: Buffer): Promise<boolean> {
  const thumbnail = await sharp(buffer)
    .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(thumbnailPathForOriginal(path), thumbnail, {
    contentType: 'image/webp',
    cacheControl: '3600',
    upsert: true,
  });
  return !error;
}

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1시간

export async function createSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function removeFromStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const withThumbnails = [...new Set(paths.flatMap((path) => path.includes('/original/') ? [path, thumbnailPathForOriginal(path)] : [path]))];
  const result = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(withThumbnails);
  unwrapVoid(result, '스토리지 파일 삭제에 실패했습니다.');
}
