import { once } from 'node:events';
import { Readable, type Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { ZipFile } from 'yazl';
import { env } from '../config/env.js';
import { renderDataExportEmail } from '../emails/data-export-email.js';
import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { listGenerationExports } from '../repositories/generation-export.repository.js';
import { findProjectsByOwner } from '../repositories/project.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { EXPORT_TOKEN_TTL_SECONDS, signExportToken } from '../utils/export-token.js';
import { exportAccountData } from './account.service.js';
import { sendEmail } from './email.service.js';
import { captionSticker } from './generation.service.js';
import { getProjectResults } from './result.service.js';

/** ZIP 안 경로에 쓸 수 없는 문자를 바꾸고 길이를 줄인다. 비면 대체 이름을 쓴다. */
export function safeFileName(value: string | null | undefined, fallback: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = (value ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80);
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : fallback;
}

const extensionOf = (path: string, fallback: string) => /\.([a-z0-9]{2,5})$/i.exec(path)?.[1]?.toLowerCase() ?? fallback;
const withoutExtension = (name: string) => name.replace(/\.[^.]+$/, '');

/** 받는 쪽(브라우저·연결)이 끊겨 ZIP 만들기를 멈췄을 때 */
export class ExportAbortedError extends Error {
  constructor() {
    super('Account export aborted by the client');
    this.name = 'ExportAbortedError';
  }
}

class ExportWriter {
  readonly zip = new ZipFile();
  readonly missing: string[] = [];
  private abortedError: ExportAbortedError | null = null;
  private rejectAborted!: (error: ExportAbortedError) => void;
  /** 중단되면 reject되는 약속. 진행 중인 기다림을 모두 이것과 경쟁시켜 멈춘 채 남지 않게 한다. */
  readonly aborted = new Promise<never>((_resolve, reject) => { this.rejectAborted = reject; });

  constructor() {
    this.aborted.catch(() => undefined); // 아무도 기다리지 않을 때 unhandled rejection이 되지 않게
  }

  abort(): void {
    if (this.abortedError) return;
    this.abortedError = new ExportAbortedError();
    (this.zip.outputStream as Readable).destroy();
    this.rejectAborted(this.abortedError);
  }

  throwIfAborted(): void {
    if (this.abortedError) throw this.abortedError;
  }
  /** 문구를 합성하지 못해 문구 없는 원본으로 넣은 생성 이모티콘 */
  readonly uncaptioned: string[] = [];

  /** 한 파일씩 순서대로 넣는다. 앞 파일이 다 쓰인 뒤에 다음 파일을 받으므로 메모리에 이미지가 쌓이지 않는다. */
  async addBuffer(buffer: Buffer, path: string): Promise<void> {
    this.throwIfAborted();
    const stream = Readable.from([buffer]);
    this.zip.addReadStream(stream, path);
    try {
      await Promise.race([finished(stream), this.aborted]);
    } finally {
      if (this.abortedError) stream.destroy();
    }
  }

  async addStorageFile(storagePath: string | null | undefined, zipPath: string): Promise<void> {
    this.throwIfAborted();
    const buffer = storagePath ? await downloadFromStorage(storagePath).catch(() => null) : null;
    if (buffer) await this.addBuffer(buffer, zipPath);
    else this.missing.push(zipPath);
  }

  addJson(value: unknown, path: string): void {
    this.zip.addBuffer(Buffer.from(`${JSON.stringify(value, null, 2)}\n`), path);
  }
}

function readme(exportedAt: string, missing: string[], uncaptioned: string[]): string {
  return [
    'Glocalizer 내 데이터 / My Glocalizer data',
    `받은 시각 / Exported at: ${exportedAt}`,
    '',
    'my-data.json            프로필, 프로젝트 목록, 로그인 기록, 결제 내역 / profile, projects, login history, payments',
    'profile/                업로드한 프로필 사진 / uploaded profile photo',
    'localization/<프로젝트>/  project.json(OCR 원문, 번역 후보, 편집 설정), originals/(원본), text-removed/(글자를 지운 이미지)',
    'generation/<프로젝트>/    project.json(캐릭터 설명·문구·문구 스타일), images/(문구를 넣은 완성 이모티콘), images/no-caption/(문구 없는 원본)',
    '',
    '번역 글자까지 합성한 완성 이미지는 설정 페이지의 "내 컴퓨터로 받기"로 받을 때만 final/ 폴더에 들어갑니다.',
    'Finished images with translated text (final/) are included only when downloaded from the account page.',
    ...(missing.length
      ? ['', '저장소에서 읽지 못해 빠진 파일 / Files that could not be read:', ...missing.map((path) => `- ${path}`)]
      : []),
    ...(uncaptioned.length
      ? ['', '문구를 합성하지 못해 문구 없는 원본으로 넣은 파일 / Saved without the caption:', ...uncaptioned.map((path) => `- ${path}`)]
      : []),
    '',
  ].join('\n');
}

/** 계정 데이터 ZIP을 output으로 흘려보낸다. 파일 하나를 못 읽어도 나머지는 계속 담고 README에 적는다. */
export async function writeAccountExport(userId: string, sid: string | undefined, output: Writable): Promise<void> {
  const writer = new ExportWriter();
  writer.zip.outputStream.pipe(output);
  // 받는 쪽이 다 받기 전에 닫히거나 오류가 나면(탭 닫기·취소) 더 만들지 않고 붙잡은 이미지를 놓는다.
  output.once('close', () => { if (!output.writableFinished) writer.abort(); });
  output.once('error', () => writer.abort());
  const exportedAt = new Date().toISOString();

  const [data, user, projects, generations] = await Promise.all([
    exportAccountData(userId, sid),
    findUserById(userId),
    findProjectsByOwner(userId),
    listGenerationExports(userId),
  ]);
  writer.addJson(data, 'my-data.json');

  const avatar = user?.avatar_url ? /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(user.avatar_url) : null;
  if (avatar) await writer.addBuffer(Buffer.from(avatar[2]!, 'base64'), `profile/avatar.${avatar[1] === 'jpeg' ? 'jpg' : avatar[1]}`);

  for (const project of projects) {
    const folder = `localization/${safeFileName(project.name, 'project')}_${project.id.slice(0, 8)}`;
    const results = await getProjectResults(project.id, { signUrls: false });
    const images = results.assets.map((asset, index) => ({
      asset,
      file: `${String(index + 1).padStart(2, '0')}_${safeFileName(withoutExtension(asset.name), 'image')}.${extensionOf(asset.name, 'png')}`,
    }));
    writer.addJson({
      id: project.id,
      name: project.name ?? null,
      status: project.status,
      targetLanguages: project.target_languages,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      images: images.map(({ asset, file }) => ({
        file,
        originalName: asset.name,
        width: asset.width,
        height: asset.height,
        status: asset.status,
        ocrText: asset.ocr.fullText,
        regions: asset.ocr.regions.map((region) => ({
          text: region.text,
          box: region.box,
          translations: region.localizations,
          editorStyles: asset.regionEditorStates[region.id] ?? {},
        })),
        ...('errorCode' in asset ? { errorCode: asset.errorCode } : {}),
      })),
    }, `${folder}/project.json`);
    // 결과 응답에는 저장소 경로가 없어서(외부에 노출하지 않음) 파일 경로는 에셋 행에서 직접 읽는다.
    const paths = new Map((await findAssetsByProjectId(project.id)).map((row) => [row.id, row]));
    for (const { asset, file } of images) {
      const row = paths.get(asset.id);
      await writer.addStorageFile(row?.original_path, `${folder}/originals/${file}`);
      await writer.addStorageFile(row?.cleaned_path, `${folder}/text-removed/${withoutExtension(file)}.${extensionOf(row?.cleaned_path ?? '', 'png')}`);
    }
  }

  for (const generation of generations) {
    const folder = `generation/${safeFileName(generation.name, 'generation')}_${generation.id.slice(0, 8)}`;
    writer.addJson({
      id: generation.id, name: generation.name, prompt: generation.prompt, status: generation.status, createdAt: generation.createdAt, plan: generation.plan,
      images: generation.images.map((image) => ({ slot: image.slot, caption: image.caption, captionStyle: image.captionStyle, prompt: image.prompt })),
    }, `${folder}/project.json`);
    for (const image of generation.images) {
      const name = `slot-${String(image.slot).padStart(2, '0')}.png`;
      const raw = await downloadFromStorage(image.path).catch(() => null);
      if (!raw) {
        writer.missing.push(`${folder}/images/${name}`);
        continue;
      }
      // 다운로드 버튼(generation.routes.ts)과 같이 저장된 문구 스타일로 문구를 합성한 완성본을 넣는다.
      const captioned = await captionSticker(raw, image.caption, image.captionStyle).catch(() => null);
      if (!captioned) writer.uncaptioned.push(`${folder}/images/${name}`);
      await writer.addBuffer(captioned ?? raw, `${folder}/images/${name}`);
      await writer.addBuffer(raw, `${folder}/images/no-caption/${name}`);
    }
  }

  writer.zip.addBuffer(Buffer.from(readme(exportedAt, writer.missing, writer.uncaptioned)), 'README.txt');
  writer.throwIfAborted();
  writer.zip.end();
  await Promise.race([once(writer.zip.outputStream, 'end'), writer.aborted]);
}

function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}

/** 계정 이메일로 24시간짜리 다운로드 링크를 보낸다. 보낸 주소는 가려서 돌려준다. */
export async function sendDataExportEmail(userId: string, requestOrigin: string): Promise<{ sentTo: string }> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  if (!user.email) throw new AppError('EMAIL_REQUIRED');
  const token = signExportToken({ sub: user.id, ver: user.session_version ?? 0 });
  const downloadUrl = `${(env.PUBLIC_API_ORIGIN ?? requestOrigin).replace(/\/+$/, '')}/api/v1/auth/me/export.zip?token=${token}`;
  const sent = await sendEmail({
    to: user.email,
    ...renderDataExportEmail({ downloadUrl, siteUrl: env.FRONTEND_ORIGIN, expiresAt: new Date(Date.now() + EXPORT_TOKEN_TTL_SECONDS * 1000) }),
  });
  if (!sent) throw new AppError('EMAIL_NOT_CONFIGURED');
  return { sentTo: maskEmail(user.email) };
}
