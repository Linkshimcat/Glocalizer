import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
const mocks=vi.hoisted(()=>({assets:vi.fn(),update:vi.fn(),download:vi.fn(),thumbnail:vi.fn()}));
vi.mock('../../src/config/env.js',()=>({env:{MAX_FILE_SIZE_BYTES:1000,MAX_IMAGE_WIDTH:1024,MAX_IMAGE_HEIGHT:1024}}));
vi.mock('../../src/repositories/asset.repository.js',()=>({findAssetsByIds:mocks.assets,updateAsset:mocks.update}));
vi.mock('../../src/repositories/storage.repository.js',()=>({downloadFromStorage:mocks.download,uploadThumbnailForOriginal:mocks.thumbnail}));
vi.mock('../../src/config/logger.js',()=>({logger:{warn:vi.fn()}}));
const {completeUploads}=await import('../../src/services/upload.service.js');
const asset=(id:string)=>({id,original_path:`projects/x/original/${id}.png`,mime_type:'image/png',byte_size:1,status:'pending_upload'});
beforeEach(()=>{vi.clearAllMocks();mocks.update.mockResolvedValue(undefined);mocks.thumbnail.mockResolvedValue(true);});
describe('upload limits applied to actual bytes',()=>{
 it('rejects an oversized payload even when the declared size is small',async()=>{
  mocks.assets.mockResolvedValue([asset('a')]);mocks.download.mockResolvedValue(Buffer.alloc(1001));
  expect(await completeUploads('project',['a'])).toEqual([expect.objectContaining({status:'failed',errorCode:'FILE_TOO_LARGE'})]);
  expect(mocks.thumbnail).not.toHaveBeenCalled();
 });
 it('records the decoded file size rather than the declared size',async()=>{
  const png=await sharp({create:{width:16,height:16,channels:4,background:'#00000000'}}).png().toBuffer();
  mocks.assets.mockResolvedValue([asset('a')]);mocks.download.mockResolvedValue(png);
  await completeUploads('project',['a']);expect(mocks.update).toHaveBeenCalledWith('a',expect.objectContaining({status:'uploaded',byteSize:png.length,width:16,height:16}));
 });
 it('bounds simultaneous downloads and decoding to four assets',async()=>{
  mocks.assets.mockResolvedValue(Array.from({length:12},(_,i)=>asset(String(i))));
  let active=0,peak=0;
  mocks.download.mockImplementation(async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return null;});
  await completeUploads('project',[]);expect(peak).toBe(4);expect(mocks.download).toHaveBeenCalledTimes(12);
 });
});
