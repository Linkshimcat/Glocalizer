import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import sharp from 'sharp';
import { z } from 'zod';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';
import { findUserById } from '../repositories/user.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import { asyncHandler } from '../utils/async-handler.js';
import { unwrapList, unwrapNullableRow, unwrapRow } from '../utils/db-result.js';
import { captionSticker, enqueueGeneration, generationWorkspace, ownedGeneration, type GenerationProject, type GenerationImage } from '../services/generation.service.js';

export const generationRouter=Router();
generationRouter.use('/generation',authMiddleware,asyncHandler(async(req,_res,next)=>{
 const user=await findUserById(requireAuth(req).sub);
 if(!user) throw new AppError('UNAUTHORIZED');
 next();
}));
generationRouter.get('/generation/config',asyncHandler(async(_req,res)=>{res.json({enabled:env.ENABLE_IMAGE_GENERATION&&!!env.OPENAI_API_KEY,budgetUsd:env.IMAGE_GENERATION_BUDGET_USD,model:'gpt-image-2.5-sunburst'});}));
generationRouter.get('/generation/projects',asyncHandler(async(req,res)=>{
 const result=await supabase.from('generation_projects').select().eq('owner_id',requireAuth(req).sub).order('created_at',{ascending:false});
 // Deploying the disabled UI before its migration should remain usable.
 if(!env.ENABLE_IMAGE_GENERATION && result.error && ['PGRST205','42P01'].includes(result.error.code)) {res.json({projects:[]});return;}
 const projects=unwrapList<GenerationProject>(result,'생성 목록 조회 실패');
 res.json({projects:await Promise.all(projects.map(generationWorkspace))});
}));
generationRouter.post('/generation/projects',asyncHandler(async(req,res)=>{
 const {prompt,reference}=z.object({prompt:z.string().trim().min(1).max(1000),reference:z.string().max(850_000).optional()}).parse(req.body);
 const owner=requireAuth(req).sub;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const existing=unwrapNullableRow<GenerationProject>(await supabase.from('generation_projects').select().eq('owner_id',owner).eq('day',day).maybeSingle(),'생성 작업 조회 실패');
 if(existing) throw new AppError('GENERATION_LIMIT',undefined,'오늘의 작업이 이미 있습니다. 기존 작업을 이어주세요.');
 const id=randomUUID();let referencePath:string|null=null;
 if(reference) {
  if(!/^data:image\/(png|jpeg|webp);base64,/.test(reference)) throw new AppError('INVALID_FILE_TYPE');
  const bytes=Buffer.from(reference.split(',')[1],'base64');
  if(bytes.length>600_000) throw new AppError('FILE_TOO_LARGE');
  const normalized=await sharp(bytes,{limitInputPixels:16_777_216}).rotate().resize(800,800,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
  referencePath=`generation/${owner}/${id}/reference.png`;await uploadToStorage(referencePath,normalized,'image/png');
 }
 const project=unwrapRow<GenerationProject>(await supabase.from('generation_projects').insert({id,owner_id:owner,prompt,reference_path:referencePath,day}).select().single(),'생성 작업 저장 실패');
 res.status(201).json(await generationWorkspace(project));
}));
generationRouter.get('/generation/projects/:id',asyncHandler(async(req,res)=>{res.json(await generationWorkspace(await ownedGeneration(z.uuid().parse(req.params.id),requireAuth(req).sub)));}));
generationRouter.post('/generation/projects/:id/images',asyncHandler(async(req,res)=>{
 const id=z.uuid().parse(req.params.id); const {slot,prompt}=z.object({slot:z.number().int().min(0).max(3),prompt:z.string().trim().min(1).max(500)}).parse(req.body);
 await ownedGeneration(id,requireAuth(req).sub);
 res.status(202).json({id:await enqueueGeneration(requireAuth(req).sub,id,slot,prompt)});
}));
generationRouter.post('/generation/projects/:id/samples',asyncHandler(async(req,res)=>{
 const id=z.uuid().parse(req.params.id);await ownedGeneration(id,requireAuth(req).sub);
 const {prompts}=z.object({prompts:z.array(z.string().trim().min(1).max(500)).length(3)}).parse(req.body);
 if(!env.ENABLE_IMAGE_GENERATION||!env.OPENAI_API_KEY) throw new AppError('GENERATION_DISABLED');
 const result=await supabase.rpc('enqueue_generation_samples',{p_owner:requireAuth(req).sub,p_project:id,p_prompts:prompts,p_reserve:env.IMAGE_GENERATION_RESERVE_USD,p_budget:env.IMAGE_GENERATION_BUDGET_USD});
 if(result.error) throw new AppError(result.error.message.includes('LIMIT')?'GENERATION_LIMIT':'INVALID_REQUEST');
 res.status(202).end();
}));
generationRouter.post('/generation/projects/:id/confirm',asyncHandler(async(req,res)=>{
 const id=z.uuid().parse(req.params.id);await ownedGeneration(id,requireAuth(req).sub);
 const result=await supabase.rpc('confirm_generation',{p_owner:requireAuth(req).sub,p_project:id});
 if(result.error) throw new AppError(result.error.message.includes('RUNNING')?'PROCESS_ALREADY_RUNNING':'INVALID_REQUEST');
 res.status(204).end();
}));
generationRouter.patch('/generation/projects/:id/images/:imageId',asyncHandler(async(req,res)=>{
 const id=z.uuid().parse(req.params.id),imageId=z.uuid().parse(req.params.imageId);
 await ownedGeneration(id,requireAuth(req).sub);
 const {caption}=z.object({caption:z.string().trim().max(16)}).parse(req.body);
 const result=await supabase.from('generation_images').update({caption}).eq('id',imageId).eq('project_id',id).eq('status','completed').select('id').maybeSingle();
 if(!unwrapNullableRow(result,'문구 저장 실패')) throw new AppError('NOT_FOUND');res.status(204).end();
}));
generationRouter.get('/generation/projects/:id/images/:imageId/download',asyncHandler(async(req,res)=>{
 const id=z.uuid().parse(req.params.id),imageId=z.uuid().parse(req.params.imageId);await ownedGeneration(id,requireAuth(req).sub);
 const image=unwrapNullableRow<GenerationImage>(await supabase.from('generation_images').select().eq('id',imageId).eq('project_id',id).eq('status','completed').maybeSingle(),'이미지 조회 실패');
 if(!image?.path) throw new AppError('NOT_FOUND');const png=await downloadFromStorage(image.path);if(!png) throw new AppError('NOT_FOUND');
 res.set('Content-Type','image/png').set('Content-Disposition',`attachment; filename="sample-${image.slot}.png"`).send(await captionSticker(png,image.caption));
}));
