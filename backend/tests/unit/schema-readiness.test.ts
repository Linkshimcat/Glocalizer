import { env } from '../../src/config/env.js';
import { describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),bucket:vi.fn()}));
vi.mock('../../src/config/supabase.js',()=>({supabase:{rpc:mocks.rpc,storage:{getBucket:mocks.bucket}}}));
const {checkServiceDependencies}=await import('../../src/repositories/health.repository.js');
describe('required schema readiness',()=>{
 it.each([{data:null,error:{message:'function missing'}},{data:false,error:null}])('fails closed when required migrations are absent',async result=>{
  mocks.rpc.mockResolvedValue(result);mocks.bucket.mockResolvedValue({data:{id:'private',public:false,file_size_limit:env.MAX_FILE_SIZE_BYTES},error:null});
  expect(await checkServiceDependencies()).toEqual({database:false,storage:true});
 });
 it('requires the schema probe to return true',async()=>{
  mocks.rpc.mockResolvedValue({data:true,error:null});mocks.bucket.mockResolvedValue({data:{id:'private',public:false,file_size_limit:env.MAX_FILE_SIZE_BYTES},error:null});
  expect(await checkServiceDependencies()).toEqual({database:true,storage:true});
 });
});

it('rejects a public or uncapped bucket',async()=>{
 mocks.rpc.mockResolvedValue({data:true,error:null});mocks.bucket.mockResolvedValue({data:{id:'private',public:true,file_size_limit:null},error:null});
 expect(await checkServiceDependencies()).toEqual({database:true,storage:false});
});
