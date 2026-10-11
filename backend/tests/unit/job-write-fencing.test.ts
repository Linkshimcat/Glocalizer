import { beforeEach, expect, it, vi } from 'vitest';
const supabase=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('../../src/config/supabase.js',()=>({supabase}));
const {updateAsset}=await import('../../src/repositories/asset.repository.js');
const {updateProjectStage}=await import('../../src/repositories/project.repository.js');
const {replaceOcrRegions,updateRegionFontStyle}=await import('../../src/repositories/ocr.repository.js');
const {withTask}=await import('../../src/utils/task-context.js');
const task=()=>({kind:'localization' as const,id:'job',projectId:'project',leaseToken:'fresh-lease',assetIds:['asset'],controller:new AbortController()});
beforeEach(()=>vi.clearAllMocks());
it('routes worker state, OCR and style writes through the claimed token without direct table writes',async()=>{
 supabase.rpc.mockResolvedValue({data:{},error:null});
 await withTask(task(),async()=>{
  await updateProjectStage('project',{stage:'cleaning'});await updateAsset('asset',{status:'completed'});
  await replaceOcrRegions('asset',[]);await updateRegionFontStyle('region',{} as never);
 });
 expect(supabase.rpc.mock.calls.map(([,args])=>args.p_operation)).toEqual(['project','asset','ocr_replace','ocr_patch']);
 for(const [name,args] of supabase.rpc.mock.calls){expect(name).toBe('mutate_localization_job');expect(args).toMatchObject({p_job:'job',p_lease:'fresh-lease'});}
 expect(supabase.from).not.toHaveBeenCalled();
});
it('cancels a stale attempt immediately and refuses any further writes',async()=>{
 supabase.rpc.mockResolvedValue({data:null,error:null});const context=task();
 await withTask(context,async()=>{
  await expect(updateAsset('asset',{status:'completed'})).rejects.toThrow('Job lease lost');
  expect(context.controller.signal.aborted).toBe(true);
  await expect(updateProjectStage('project',{status:'completed'})).rejects.toThrow('Job lease lost');
 });
 expect(supabase.rpc).toHaveBeenCalledTimes(1);expect(supabase.from).not.toHaveBeenCalled();
});
