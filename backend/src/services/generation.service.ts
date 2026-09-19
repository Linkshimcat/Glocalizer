import sharp from 'sharp';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { createSignedUrl, downloadFromStorage, removeFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';

export interface GenerationProject { id: string; owner_id: string; prompt: string; reference_path: string | null; confirmed: boolean; created_at: string; day: string }
export interface GenerationImage { id: string; project_id: string; slot: number; prompt: string; status: string; path: string | null; caption: string; error: string | null; cost_usd: number | null; reserve_usd: number; usage: unknown; elapsed_ms: number | null }
export async function ownedGeneration(id: string, owner: string) {
 const row = unwrapNullableRow<GenerationProject>(await supabase.from('generation_projects').select().eq('id',id).eq('owner_id',owner).maybeSingle(), '생성 작업 조회 실패');
 if (!row) throw new AppError('NOT_FOUND');
 return row;
}
export async function generationWorkspace(project: GenerationProject) {
 const images = unwrapList<GenerationImage>(await supabase.from('generation_images').select().eq('project_id',project.id).order('created_at'), '생성 결과 조회 실패');
 return { ...project, referenceUrl: project.reference_path ? await createSignedUrl(project.reference_path) : null,
 images: await Promise.all(images.map(async image => ({ ...image, url: image.path ? await createSignedUrl(image.path) : null }))) };
}
export async function enqueueGeneration(owner: string, project: string, slot: number, prompt: string) {
 if (!env.ENABLE_IMAGE_GENERATION || !env.OPENAI_API_KEY) throw new AppError('GENERATION_DISABLED');
 const result = await supabase.rpc('enqueue_generation',{p_owner:owner,p_project:project,p_slot:slot,p_prompt:prompt,p_reserve:env.IMAGE_GENERATION_RESERVE_USD,p_budget:env.IMAGE_GENERATION_BUDGET_USD});
 if (result.error) {
  if (result.error.message.includes('LIMIT')) throw new AppError('GENERATION_LIMIT');
  if (result.error.message.includes('RUNNING')) throw new AppError('PROCESS_ALREADY_RUNNING');
  if (result.error.message.includes('NOT_FOUND')) throw new AppError('NOT_FOUND');
  throw new AppError('INVALID_REQUEST',undefined,'캐릭터 확정 상태를 확인해주세요.');
 }
 return result.data as string;
}
export async function normalizeSticker(input: Buffer): Promise<Buffer> {
 const source = sharp(input,{limitInputPixels:16_777_216});
 const metadata = await source.metadata();
 const sourceStats = await source.stats();
 if (!metadata.hasAlpha || sourceStats.channels[3]?.min === 255 || sourceStats.channels[3]?.max === 0) throw new AppError('GENERATION_FAILED',undefined,'유효한 투명 배경 캐릭터가 생성되지 않았습니다.');
 const image = await sharp(input,{limitInputPixels:16_777_216}).rotate().toColourspace('srgb').resize(714,554,{fit:'contain',background:'#00000000'}).extend({top:3,bottom:3,left:3,right:3,background:'#00000000'}).ensureAlpha().raw().toBuffer();
 // White outline follows the character alpha; keep transparent canvas.
 const outline = Buffer.alloc(image.length);
 for (let y=0;y<560;y++) for(let x=0;x<720;x++) {
  let alpha=0;
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++) {
   const yy=y+dy,xx=x+dx;
   if(yy>=0&&yy<560&&xx>=0&&xx<720) alpha=Math.max(alpha,image[(yy*720+xx)*4+3]);
  }
  const index=(y*720+x)*4; outline[index]=255;outline[index+1]=255;outline[index+2]=255;outline[index+3]=alpha;
 }
 const body=await sharp(outline,{raw:{width:720,height:560,channels:4}}).composite([{input:await sharp(image,{raw:{width:720,height:560,channels:4}}).png().toBuffer()}]).png().toBuffer();
 const png=await sharp({create:{width:740,height:640,channels:4,background:'#00000000'}}).composite([{input:body,left:10,top:70}]).withMetadata({density:72}).png({compressionLevel:9}).toBuffer();
 if(png.length>1_000_000) throw new AppError('FILE_TOO_LARGE',undefined,'OGQ PNG 용량 1MB를 초과했습니다. 다른 결과를 생성해주세요.');
 const stats=await sharp(png).stats();
 if(stats.channels[3].min===255) throw new AppError('GENERATION_FAILED',undefined,'투명 배경이 생성되지 않았습니다.');
 return png;
}
function escapeXml(text: string) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)); }
export async function captionSticker(image: Buffer, caption: string) {
 if(!caption) return image;
 const svg=Buffer.from(`<svg width="740" height="640" xmlns="http://www.w3.org/2000/svg"><text x="370" y="55" text-anchor="middle" font-family="Noto Sans CJK KR, sans-serif" font-size="36" font-weight="900" fill="#202630" stroke="white" stroke-width="7" paint-order="stroke">${escapeXml(caption)}</text></svg>`);
 const result=await sharp(image).composite([{input:svg}]).withMetadata({density:72}).png({compressionLevel:9}).toBuffer();
 if(result.length>1_000_000) throw new AppError('FILE_TOO_LARGE');
 return result;
}
interface ImageResponse { data?: {b64_json?:string}[]; usage?: {input_tokens_details?:{text_tokens:number;image_tokens:number};output_tokens:number} }
export function imageUsageCost(usage: ImageResponse['usage']): number | null {
 if(!usage?.input_tokens_details || !Number.isFinite(usage.output_tokens)) return null;
 const {text_tokens,image_tokens}=usage.input_tokens_details;
 if(!Number.isFinite(text_tokens)||!Number.isFinite(image_tokens)) return null;
 return (text_tokens*5+image_tokens*8+usage.output_tokens*30)/1_000_000;
}
export async function processGenerationImage(job: GenerationImage) {
 const project=unwrapRow<GenerationProject>(await supabase.from('generation_projects').select().eq('id',job.project_id).single(),'생성 작업 없음');
 const started=Date.now();
 try {
  let reference:Buffer|null=null;
  if(job.slot===0 && project.reference_path) reference=await downloadFromStorage(project.reference_path);
  if(job.slot!==0) {
   const base=unwrapRow<GenerationImage>(await supabase.from('generation_images').select().eq('project_id',project.id).eq('slot',0).eq('status','completed').order('created_at',{ascending:false}).limit(1).single(),'대표 캐릭터 없음');
   if(base.path) reference=await downloadFromStorage(base.path);
  }
  if((job.slot!==0||project.reference_path)&&!reference) throw new AppError('GENERATION_FAILED');
  const prompt=`Create one original expressive Korean-market character sticker. Transparent background, crisp clean illustration, entire character visible, no captions, letters, watermarks or logos. ${job.slot===0?'Establish the character design.':'Preserve the exact character identity, palette, proportions and drawing style from the reference. Change only pose and expression.'} Character: ${project.prompt}. Pose/expression: ${job.prompt}`;
  const options={model:'gpt-image-2.5-sunburst',prompt,n:1,size:'1024x1024',quality:'medium',background:'transparent',output_format:'png'};
  let body: string|FormData;
  if(reference) { body=new FormData();for(const [key,value] of Object.entries(options)) body.set(key,String(value));body.set('image[]',new Blob([new Uint8Array(reference)],{type:'image/png'}),'reference.png'); }
  else body=JSON.stringify(options);
  const response=await fetch(`${env.OPENAI_BASE_URL}/images/${reference?'edits':'generations'}`,{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,...(reference?{}:{'Content-Type':'application/json'})},body,signal:AbortSignal.timeout(180_000)});
  if(!response.ok) throw new AppError('GENERATION_FAILED',undefined,`이미지 API 요청 실패 (${response.status}). 잔액·모델 권한을 확인해주세요.`);
  const payload=await response.json() as ImageResponse;
  // Account for a paid response even if subsequent validation/storage fails.
  unwrapVoid(await supabase.from('generation_images').update({usage:payload.usage??null,cost_usd:imageUsageCost(payload.usage)}).eq('id',job.id),'사용량 저장 실패');
  if(!payload.data?.[0]?.b64_json) throw new AppError('GENERATION_FAILED');
  const png=await normalizeSticker(Buffer.from(payload.data[0].b64_json,'base64'));
  const path=`generation/${project.owner_id}/${project.id}/${job.id}.png`;
  await uploadToStorage(path,png,'image/png');
  unwrapVoid(await supabase.from('generation_images').update({status:'completed',path,elapsed_ms:Date.now()-started}).eq('id',job.id),'결과 저장 실패');
 } catch(error) {
  unwrapVoid(await supabase.from('generation_images').update({status:'failed',error:error instanceof AppError?error.message:'이미지 생성이 중단됐습니다. 선택 재생성으로 다시 시도해주세요.',elapsed_ms:Date.now()-started}).eq('id',job.id),'실패 상태 저장 실패');
 }
}
/** DB 삭제는 FK cascade(generation_projects -> generation_images)로 처리되지만, Storage 파일은
 *  별도로 지워야 한다. 계정 탈퇴 시 deleteAccount에서 호출한다.
 *  이모티콘 생성 기능은 아직 "준비 중"이라 이 테이블 자체가 없는 환경(마이그레이션 미적용)이
 *  있을 수 있어, 그 경우(42P01 undefined_table)는 정리할 게 없는 것으로 보고 조용히 넘어간다. */
export async function deleteGenerationsByOwner(ownerId: string): Promise<void> {
 const projectsResult = await supabase.from('generation_projects').select().eq('owner_id',ownerId);
 if (projectsResult.error) {
  if (projectsResult.error.code === '42P01') return;
  throw new AppError('INTERNAL_ERROR', { cause: projectsResult.error.message }, '생성 작업 조회 실패');
 }
 const projects = projectsResult.data as GenerationProject[];
 if (projects.length === 0) return;
 const projectIds = projects.map(p => p.id);
 const images = unwrapList<GenerationImage>(await supabase.from('generation_images').select().in('project_id',projectIds),'생성 결과 조회 실패');
 const paths = [...projects.map(p => p.reference_path), ...images.map(i => i.path)].filter((path): path is string => Boolean(path));
 await removeFromStorage(paths);
 unwrapVoid(await supabase.from('generation_projects').delete().eq('owner_id',ownerId),'생성 작업 삭제 실패');
}
