import sharp from 'sharp';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { createSignedUrl, downloadFromStorage, removeFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';

export interface StickerPlanItem { slot: number; pose: string; caption: string }
export interface GenerationProject { id: string; owner_id: string; prompt: string; name: string | null; reference_path: string | null; confirmed: boolean; created_at: string; day: string; status: 'active'|'completed'; completed_at: string|null; plan: StickerPlanItem[] }
export interface CaptionStyle { anchor: string; size: number; color: string; stroke: string }
export interface GenerationImage { id: string; project_id: string; slot: number; prompt: string; status: string; path: string | null; caption: string; caption_style: CaptionStyle | null; error: string | null; cost_usd: number | null; reserve_usd: number; usage: unknown; elapsed_ms: number | null }
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

export async function saveGeneratedCaption(imageId:string,caption:string) {
 unwrapVoid(await supabase.from('generation_images').update({caption}).eq('id',imageId).eq('caption',''),'자동 문구 저장 실패');
}

const captionResponseSchema=z.object({captions:z.array(z.string()).min(1).max(4)});
const CAPTION_MAX_LENGTH=10;
function cleanCaption(value:string) {
 return Array.from(value.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').replace(/^["'“”‘’]+|["'“”‘’]+$/g,'').trim()).slice(0,CAPTION_MAX_LENGTH).join('');
}
function fallbackCaption(pose:string,index:number) {
 const text=pose.toLowerCase();
 if(/인사|안녕|hello|wave/.test(text)) return '안녕!';
 if(/감사|고마|thank/.test(text)) return '고마워!';
 if(/미안|사과|sorry/.test(text)) return '미안해';
 if(/사랑|하트|love/.test(text)) return '사랑해!';
 if(/슬프|눈물|울|sad|cry/.test(text)) return '속상해…';
 if(/화|분노|angry/.test(text)) return '화났어!';
 if(/축하|celebrat/.test(text)) return '축하해!';
 if(/잘 ?자|잠|sleep/.test(text)) return '잘 자';
 return ['좋아!','힘내!','대박!','오케이!'][index%4];
}
export async function suggestStickerCaptions(character:string,poses:string[]):Promise<string[]> {
 const fallbacks=poses.map(fallbackCaption);
 if(!env.OPENAI_API_KEY) return fallbacks;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),env.IMAGE_CAPTION_TIMEOUT_MS);
 try {
  const response=await fetch(`${env.OPENAI_BASE_URL}/chat/completions`,{
   method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:env.IMAGE_CAPTION_MODEL,max_completion_tokens:500,response_format:{type:'json_object'},messages:[{role:'user',content:`You write concise Korean captions for OGQ Market chat stickers. Return JSON only: {"captions":[...]}. Write exactly ${poses.length} captions in the same order as the poses. Each caption must be natural Korean used in everyday chat, one line, at most ${CAPTION_MAX_LENGTH} visible characters including spaces and punctuation, immediately readable on a mobile screen, and clearly match the pose. Keep the set varied. Avoid spelling errors, brands, copyrighted catchphrases, profanity, violence, politics, religion, sexual content, hashtags and emoji.\nCharacter: ${character.slice(0,1000)}\nPoses: ${JSON.stringify(poses)}`}]}),
   signal:controller.signal,
  });
  if(!response.ok) throw new Error(`caption API ${response.status}`);
  const body=await response.json() as {choices?:Array<{message?:{content?:string}}>};
  const content=body.choices?.[0]?.message?.content;
  if(!content) throw new Error('empty caption response');
  const parsed=captionResponseSchema.parse(JSON.parse(content));
  if(parsed.captions.length!==poses.length) throw new Error('caption count mismatch');
  return parsed.captions.map((caption,index)=>cleanCaption(caption)||fallbacks[index]);
 } catch(error) {
  logger.warn({err:error},'Sticker caption suggestion failed; using safe fallbacks');
  return fallbacks;
 } finally { clearTimeout(timeout); }
}

export async function saveSampleCaptions(projectId:string,captions:string[]) {
 const result=await supabase.from('generation_images').select('id,slot,created_at').eq('project_id',projectId).in('slot',[1,2,3]).order('created_at',{ascending:false});
 const rows=unwrapList<{id:string;slot:number}>(result,'자동 문구 대상 조회 실패');
 const latestBySlot=new Map<number,string>();
 for(const row of rows) if(!latestBySlot.has(row.slot)) latestBySlot.set(row.slot,row.id);
 await Promise.all(captions.map(async(caption,index)=>{
  const id=latestBySlot.get(index+1);
  if(id) unwrapVoid(await supabase.from('generation_images').update({caption}).eq('id',id),'자동 문구 저장 실패');
 }));
}
const FALLBACK_STICKER_PLAN:StickerPlanItem[]=[
 {slot:1,pose:'밝게 손을 흔들며 인사',caption:'안녕!'},{slot:2,pose:'두 손을 모아 감사 인사',caption:'고마워!'},{slot:3,pose:'고개를 숙여 사과',caption:'미안해'},
 {slot:4,pose:'엄지를 들며 활짝 웃기',caption:'좋아!'},{slot:5,pose:'두 팔을 높이 들고 기뻐하기',caption:'최고야!'},{slot:6,pose:'폭죽과 함께 축하하기',caption:'축하해!'},
 {slot:7,pose:'큰 하트를 품에 안기',caption:'사랑해!'},{slot:8,pose:'멀리 바라보며 그리워하기',caption:'보고 싶어'},{slot:9,pose:'두 주먹을 쥐고 응원하기',caption:'힘내!'},
 {slot:10,pose:'주먹을 불끈 쥐고 파이팅',caption:'파이팅!'},{slot:11,pose:'힘차게 박수치기',caption:'잘했어!'},{slot:12,pose:'눈을 크게 뜨고 놀라기',caption:'대박!'},
 {slot:13,pose:'고개를 갸웃하며 묻기',caption:'정말?'},{slot:14,pose:'깜짝 놀라 뒤로 물러서기',caption:'헉!'},{slot:15,pose:'당황해서 안절부절못하기',caption:'어떡해'},
 {slot:16,pose:'입을 삐죽이며 풀이 죽기',caption:'속상해…'},{slot:17,pose:'눈물을 흘리며 울기',caption:'슬퍼'},{slot:18,pose:'팔짱을 끼고 화내기',caption:'화났어!'},
 {slot:19,pose:'고개를 돌리며 거절하기',caption:'싫어!'},{slot:20,pose:'두 손을 모아 부탁하기',caption:'부탁해'},{slot:21,pose:'한 손을 내밀어 멈춰 세우기',caption:'잠깐만'},
 {slot:22,pose:'이불을 덮고 졸기',caption:'잘 자'},{slot:23,pose:'맛있게 먹으며 감탄하기',caption:'맛있다!'},
];
const planResponseSchema=z.object({items:z.array(z.object({pose:z.string(),caption:z.string()})).length(23)});
export async function suggestStickerPlan(character:string):Promise<StickerPlanItem[]> {
 if(!env.OPENAI_API_KEY) return FALLBACK_STICKER_PLAN;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),env.IMAGE_CAPTION_TIMEOUT_MS);
 try {
  const response=await fetch(`${env.OPENAI_BASE_URL}/chat/completions`,{
   method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:env.IMAGE_CAPTION_MODEL,max_completion_tokens:1800,response_format:{type:'json_object'},messages:[{role:'user',content:`Plan a cohesive 24-image Korean chat sticker set for the character below. The representative character image is already slot 0. Return JSON only: {"items":[{"pose":"...","caption":"..."}, ...]}. Write exactly 23 items for slots 1 through 23 in order. Each pose must be visually distinct and practical for daily chat. Each Korean caption must be natural, immediately readable on mobile, one line, and at most ${CAPTION_MAX_LENGTH} visible characters. Cover greetings, thanks, apology, approval, celebration, affection, encouragement, surprise, sadness, anger, refusal, requests, waiting, sleep and food. Avoid brands, copyrighted catchphrases, profanity, violence, politics, religion, sexual content, hashtags and emoji. Character: ${character.slice(0,1000)}`}]}),
   signal:controller.signal,
  });
  if(!response.ok) throw new Error(`plan API ${response.status}`);
  const body=await response.json() as {choices?:Array<{message?:{content?:string}}>};
  const content=body.choices?.[0]?.message?.content;
  if(!content) throw new Error('empty plan response');
  const parsed=planResponseSchema.parse(JSON.parse(content));
  return parsed.items.map((item,index)=>({slot:index+1,pose:Array.from(item.pose.replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim()).slice(0,200).join('')||FALLBACK_STICKER_PLAN[index].pose,caption:cleanCaption(item.caption)||FALLBACK_STICKER_PLAN[index].caption}));
 } catch(error) {
  logger.warn({err:error},'Sticker plan suggestion failed; using safe fallbacks');
  return FALLBACK_STICKER_PLAN;
 } finally { clearTimeout(timeout); }
}
export async function saveGenerationPlan(projectId:string,plan:StickerPlanItem[]) {
 unwrapVoid(await supabase.from('generation_projects').update({plan}).eq('id',projectId).eq('status','active'),'이모티콘 구성 저장 실패');
}
export async function saveBatchCaptions(projectId:string,items:StickerPlanItem[]) {
 const slots=items.map(item=>item.slot);
 const rows=unwrapList<{id:string;slot:number}>(await supabase.from('generation_images').select('id,slot,created_at').eq('project_id',projectId).in('slot',slots).order('created_at',{ascending:false}),'자동 문구 대상 조회 실패');
 const latestBySlot=new Map<number,string>();
 for(const row of rows) if(!latestBySlot.has(row.slot)) latestBySlot.set(row.slot,row.id);
 await Promise.all(items.map(async item=>{const id=latestBySlot.get(item.slot);if(id) unwrapVoid(await supabase.from('generation_images').update({caption:item.caption}).eq('id',id),'자동 문구 저장 실패');}));
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
// 9분할 앵커를 740x640 캔버스 좌표로 푼다. 백엔드 SVG와 프런트 미리보기가 같은 규칙을 쓴다.
export const CAPTION_ANCHOR_X: Record<string,number> = {left:48,center:370,right:692};
export const CAPTION_ANCHOR_Y: Record<string,number> = {top:56,middle:340,bottom:612};
const CAPTION_TEXT_ANCHOR: Record<string,string> = {left:'start',center:'middle',right:'end'};
export const CAPTION_SIZES=[30,38,46,56];
export function defaultCaptionStyle(caption: string): CaptionStyle {
 return {anchor:'top-center',size:Array.from(caption).length<=10?46:38,color:'#202630',stroke:'#ffffff'};
}
/** 평균 색을 그대로 쓰면 흐린 파스텔이라 글자가 읽히지 않는다. 색상은 남기되 가장 밝은
 *  채널을 끌어내려 충분히 어둡게 만든다. 거의 무채색이면 기본 잉크색을 쓴다. */
function captionColor(r: number, g: number, b: number) {
 const max=Math.max(r,g,b),min=Math.min(r,g,b);
 if(max-min<24||max<8) return '#202630';
 const scale=104/max;
 const channel=(value: number)=>Math.round(Math.min(255,Math.max(0,value*scale))).toString(16).padStart(2,'0');
 return `#${channel(r)}${channel(g)}${channel(b)}`;
}
/** 캐릭터가 비운 위·아래 여백을 재서 문구를 덜 가리는 쪽에 놓고, 캐릭터 색으로 글자색을
 *  맞춘다. 알파 채널만 보므로 API 호출도 추가 비용도 없다. normalizeSticker가 캐릭터에
 *  흰 테두리를 두르므로 거의 흰 픽셀은 색 평균에서 뺀다. */
export async function autoCaptionStyle(png: Buffer, caption: string): Promise<CaptionStyle> {
 const base=defaultCaptionStyle(caption);
 try {
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=info;
  let top=height,bottom=-1,red=0,green=0,blue=0,count=0;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
   const index=(y*width+x)*4;
   if(data[index+3]<48) continue;
   if(y<top) top=y;
   if(y>bottom) bottom=y;
   if(data[index]>228&&data[index+1]>228&&data[index+2]>228) continue;
   red+=data[index];green+=data[index+1];blue+=data[index+2];count++;
  }
  if(bottom<0) return base;
  const needed=base.size*1.5;
  const bottomGap=height-1-bottom;
  const anchor=bottomGap>top&&bottomGap>=needed?'bottom-center':'top-center';
  return {...base,anchor,color:count?captionColor(red/count,green/count,blue/count):base.color};
 } catch(error) {
  logger.warn({err:error},'Caption placement analysis failed; using defaults');
  return base;
 }
}
export async function captionSticker(image: Buffer, caption: string, style?: CaptionStyle | null) {
 if(!caption) return image;
 const resolved=style??defaultCaptionStyle(caption);
 const [vertical,horizontal]=resolved.anchor.split('-');
 const x=CAPTION_ANCHOR_X[horizontal]??CAPTION_ANCHOR_X.center;
 const y=CAPTION_ANCHOR_Y[vertical]??CAPTION_ANCHOR_Y.top;
 const textAnchor=CAPTION_TEXT_ANCHOR[horizontal]??'middle';
 const svg=Buffer.from(`<svg width="740" height="640" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" text-anchor="${textAnchor}" font-family="Noto Sans CJK KR, sans-serif" font-size="${resolved.size}" font-weight="900" fill="${resolved.color}" stroke="${resolved.stroke}" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${escapeXml(caption)}</text></svg>`);
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
  const style=await autoCaptionStyle(png,job.caption);
  unwrapVoid(await supabase.from('generation_images').update({status:'completed',path,caption_style:style,elapsed_ms:Date.now()-started}).eq('id',job.id),'결과 저장 실패');
 } catch(error) {
  unwrapVoid(await supabase.from('generation_images').update({status:'failed',error:error instanceof AppError?error.message:'이미지 생성이 중단됐습니다. 선택 재생성으로 다시 시도해주세요.',elapsed_ms:Date.now()-started}).eq('id',job.id),'실패 상태 저장 실패');
 }
}
/** 프로젝트 하나를 지운다. generation_images는 FK cascade로 따라 지워지지만 Storage 파일은
 *  남으므로 참조 이미지와 결과 PNG 경로를 먼저 모아 함께 삭제한다. 생성이 진행 중이면 이미
 *  비용이 발생한 호출의 결과를 버리게 되므로 거절한다. */
export async function deleteGenerationProject(project: GenerationProject) {
 const images=unwrapList<GenerationImage>(await supabase.from('generation_images').select().eq('project_id',project.id),'생성 결과 조회 실패');
 if(images.some(image=>image.status==='queued'||image.status==='running')) throw new AppError('PROCESS_ALREADY_RUNNING');
 const paths=[project.reference_path,...images.map(image=>image.path)].filter((path):path is string=>Boolean(path));
 if(paths.length) await removeFromStorage(paths);
 unwrapVoid(await supabase.from('generation_projects').delete().eq('id',project.id),'생성 작업 삭제 실패');
}
/** DB 삭제는 FK cascade(generation_projects -> generation_images)로 처리되지만, Storage 파일은
 *  별도로 지워야 한다. 계정 탈퇴 시 deleteAccount에서 호출한다.
 *  생성 기능 마이그레이션이 아직 적용되지 않은 환경에서는 정리할 생성 데이터도 없으므로
 *  Postgres/PostgREST의 테이블 누락 오류만 무시한다. */
export async function deleteGenerationsByOwner(ownerId: string): Promise<void> {
 const projectsResult = await supabase.from('generation_projects').select().eq('owner_id',ownerId);
 if (projectsResult.error) {
  if (projectsResult.error.code === '42P01' || projectsResult.error.code === 'PGRST205') return;
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
