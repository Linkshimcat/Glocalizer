import {beforeEach,expect,it,vi} from 'vitest';
const remove=vi.hoisted(()=>vi.fn());
vi.mock('../../src/config/supabase.js',()=>({supabase:{storage:{from:()=>({remove})}}}));
const {removeFromStorage}=await import('../../src/repositories/storage.repository.js');
const {withTask}=await import('../../src/utils/task-context.js');
beforeEach(()=>remove.mockReset().mockResolvedValue({error:null}));
it('bounds large manifests and includes thumbnails exactly once',async()=>{
 const originals=Array.from({length:120},(_,i)=>`projects/x/original/${i}.png`);
 await removeFromStorage([...originals,originals[0]]);
 expect(remove.mock.calls.map(([paths])=>paths.length)).toEqual([100,100,40]);
 const paths=remove.mock.calls.flatMap(([paths])=>paths);
 expect(new Set(paths).size).toBe(240);expect(paths).toContain('projects/x/thumbnail/0.webp');
});
it('propagates a partial deletion failure to the durable retry handler',async()=>{
 remove.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{message:'storage offline'}});
 await expect(removeFromStorage(Array.from({length:250},(_,i)=>`file-${i}`))).rejects.toMatchObject({code:'INTERNAL_ERROR'});
 expect(remove).toHaveBeenCalledTimes(2);
});
it('does not launch additional batches after cancellation',async()=>{
 const controller=new AbortController();remove.mockImplementation(async()=>{controller.abort(new Error('closing'));return {error:null};});
 await expect(withTask({kind:'deletion',id:'task',projectId:'project',leaseToken:'lease',controller},()=>removeFromStorage(Array.from({length:250},(_,i)=>`file-${i}`)))).rejects.toThrow('closing');
 expect(remove).toHaveBeenCalledOnce();
});
