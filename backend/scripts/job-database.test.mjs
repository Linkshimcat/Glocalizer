import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
const exec = promisify(execFile);
// No DATABASE_URL is read: this suite always creates and destroys its own cluster.
const bin = process.env.TEST_POSTGRES_BIN ?? '/usr/lib/postgresql/14/bin';
test('backend invariants on an isolated PostgreSQL cluster', { timeout: 60000 }, async t => {
 const dir = await mkdtemp(join(tmpdir(), 'glocalizer-db-test-'));
 let pool;
 try {
  await exec(join(bin,'initdb'), ['-D',join(dir,'data'),'-A','trust','-U','postgres']);
  await exec(join(bin,'pg_ctl'), ['-D',join(dir,'data'),'-l',join(dir,'log'),'-o',`-k ${dir} -h '' -p 55439`,'start']);
  pool = new pg.Pool({host:dir, port:55439, user:'postgres', database:'postgres', max:5});
  await pool.query('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key)');
  const migrationDir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrationDir)).filter(f=>f.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(file,migrationDir),'utf8'));
  await pool.query('grant usage on schema public to service_role; grant all on all tables in schema public to service_role; grant usage,select on all sequences in schema public to service_role');
  const scalar = async (sql,args=[]) => Object.values((await pool.query(sql,args)).rows[0])[0];
  async function fixture(owner=null) {
   const project=randomUUID(), asset=randomUUID();
   await pool.query("insert into projects(id,owner_id,access_token_hash,target_languages,expires_at,status) values($1,$2,'test',array['en'],case when $2::uuid is null then now()+interval '1 day' else null end,'completed')",[project,owner]);
   await pool.query("insert into assets(id,project_id,original_name,mime_type,byte_size,original_path,status,width,height) values($1,$2,'test.png','image/png',100,$3,'uploaded',100,100)",[asset,project,`projects/${project}/original/${asset}.png`]);
   return {project,asset};
  }
  let job, oldLease, f;
  await t.test('concurrent claims have a single winner and fresh leases even for the same worker ID', async()=>{
   f=await fixture();job=await scalar("select enqueue_localization_job($1,array['uploaded'])",[f.project]);
   assert.equal(job.status,'queued');
   const claims=await Promise.all([scalar("select claim_localization_job('same-worker')"),scalar("select claim_localization_job('same-worker')")]);
   assert.equal(claims.filter(Boolean).length,1);job=claims.find(Boolean);oldLease=job.lease_token;
   await pool.query("update jobs set heartbeat_at=now()-interval '1 hour' where id=$1",[job.id]);
   assert.equal(await scalar('select recover_localization_jobs(1000)'),1);
   job=await scalar("select claim_localization_job('same-worker')");assert.notEqual(job.lease_token,oldLease);
   assert.equal(await scalar('select touch_localization_lease($1,$2)',[job.id,oldLease]),false);
   assert.equal(await scalar("select mutate_localization_job($1,$2,'asset',$3,'{\"status\":\"completed\"}')",[job.id,oldLease,f.asset]),null);
  });
  const region = (id=randomUUID())=>({id,asset_id:f.asset,detected_text:'수정한 문구',confidence:1,bbox:{x:1,y:1,width:20,height:10},normalized_bbox:{x:0.01,y:0.01,width:0.2,height:0.1},polygon:[],contains_korean:true,is_primary:true,reading_order:0,source:'vision-fallback',agreement_score:1,needs_manual_review:false});
  await t.test('OCR replacement rolls back deletions and dependent translations on invalid insert',async()=>{
   const r=region();
   await scalar("select mutate_localization_job($1,$2,'ocr_replace',$3,$4)",[job.id,job.lease_token,f.asset,JSON.stringify([r])]);
   await pool.query("insert into translations(ocr_region_id,language_code,generation_candidates,final_candidates,recommended_style,generation_model,prompt_version) values($1,'en','[]','[]','{}','test','test')",[r.id]);
   await assert.rejects(scalar("select mutate_localization_job($1,$2,'ocr_replace',$3,$4)",[job.id,job.lease_token,f.asset,JSON.stringify([{...r,confidence:null}])]),/null value/);
   assert.equal(await scalar('select detected_text from ocr_regions where id=$1',[r.id]),'수정한 문구');
   assert.equal(await scalar('select count(*)::int from translations where ocr_region_id=$1',[r.id]),1);
   const extra=region();await scalar("select mutate_localization_job($1,$2,'ocr_insert',$3,$4)",[job.id,job.lease_token,f.asset,JSON.stringify(extra)]);
   await scalar("select mutate_localization_job($1,$2,'ocr_insert',$3,$4)",[job.id,job.lease_token,f.asset,JSON.stringify(extra)]);
   assert.equal(await scalar('select count(*)::int from ocr_regions where id=$1',[extra.id]),1);
  });
  await t.test('recovery exhausts the attempt budget without losing completed results',async()=>{
   await scalar("select mutate_localization_job($1,$2,'asset',$3,'{\"status\":\"completed\"}')",[job.id,job.lease_token,f.asset]);
   await pool.query("update jobs set heartbeat_at=now()-interval '1 hour' where id=$1",[job.id]);
   await scalar('select recover_localization_jobs(1000)');
   assert.equal(await scalar('select status from jobs where id=$1',[job.id]),'failed');
   assert.equal(await scalar('select status from assets where id=$1',[f.asset]),'completed');
  });
  await t.test('recovery resumes corrected OCR and isolates the selected asset scope',async()=>{
   const x=await fixture();
   await pool.query("update assets set status='ocr' where id=$1",[x.asset]);
   const r={...region(),asset_id:x.asset};await pool.query('insert into ocr_regions(id,asset_id,detected_text,confidence,bbox,contains_korean,is_primary,reading_order) values($1,$2,$3,1,$4,true,true,0)',[r.id,x.asset,r.detected_text,r.bbox]);
   const queued=await scalar("select enqueue_localization_job($1,array['ocr'])",[x.project]);
   const claimed=await scalar("select claim_localization_job('ocr-worker')");
   await scalar("select mutate_localization_job($1,$2,'asset',$3,'{\"status\":\"translating\"}')",[queued.id,claimed.lease_token,x.asset]);
   await scalar("select finish_localization_job($1,$2,'TIMEOUT','temporary',true)",[queued.id,claimed.lease_token]);
   assert.equal(await scalar('select status from assets where id=$1',[x.asset]),'ocr');
   assert.equal(await scalar('select detected_text from ocr_regions where id=$1',[r.id]),'수정한 문구');
   await pool.query("update jobs set status='failed' where id=$1",[queued.id]);
   await pool.query("update assets set status='failed' where id=$1",[x.asset]);
   const retry=await scalar("select enqueue_localization_job($1,array['failed'],$2)",[x.project,JSON.stringify({operation:'retry',assetId:x.asset})]);
   assert.equal(retry.initial_states[x.asset],'ocr');
   const attempt=await scalar("select claim_localization_job('manual-retry')");
   await scalar("select finish_localization_job($1,$2,'TEMPORARY','retry',true)",[retry.id,attempt.lease_token]);
   assert.equal(await scalar('select status from assets where id=$1',[x.asset]),'ocr');
   assert.equal(await scalar('select detected_text from ocr_regions where id=$1',[r.id]),'수정한 문구');
   await pool.query("update jobs set status='failed' where id=$1",[retry.id]);
  });
  await t.test('deletion rejects active work and serializes against a concurrent enqueue',async()=>{
   const owner=randomUUID();await pool.query("insert into users(id,email,signup_method) values($1,$2,'email')",[owner,`${owner}@test.invalid`]);
   const x=await fixture(owner);
   const queued=await scalar("select enqueue_localization_job($1,array['uploaded'])",[x.project]);
   await assert.rejects(scalar("select reserve_deletion('account',$1)",[owner]),/PROCESS_ALREADY_RUNNING/);
   assert.equal(await scalar('select deleting_at from users where id=$1',[owner]),null);
   await pool.query("update jobs set status='failed' where id=$1",[queued.id]);
   const lock=await pool.connect();await lock.query('begin');await lock.query('select id from users where id=$1 for update',[owner]);
   const reservation=await lock.query("select reserve_deletion('account',$1) id",[owner]);
   const concurrent=scalar("select enqueue_localization_job($1,array['uploaded'])",[x.project]).then(()=>({ok:true}),error=>({error}));
   await lock.query('commit');lock.release();assert.match((await concurrent).error.message,/PROJECT_NOT_FOUND/);
   const task=await scalar('select claim_deletion($1)',[reservation.rows[0].id]);assert.ok(task.paths.some(path=>path.includes(x.asset)));
   await assert.rejects(pool.query("update assets set status='uploaded' where id=$1",[x.asset]),/ACCOUNT_DELETING/);
   await scalar("select finish_deletion($1,$2,'storage unavailable')",[task.id,task.lease_token]);
   assert.equal(await scalar('select count(*)::int from users where id=$1',[owner]),1);
   const retry=await scalar('select claim_deletion($1)',[task.id]);assert.deepEqual(retry.paths,task.paths);
   await scalar('select finish_deletion($1,$2)',[retry.id,retry.lease_token]);assert.equal(await scalar('select count(*)::int from users where id=$1',[owner]),0);
   assert.deepEqual(await scalar('select paths from deletion_tasks where id=$1',[task.id]),task.paths);
  });
  await t.test('stale paid generation fails without retry and retains reservation and late usage',async()=>{
   const owner=randomUUID();await pool.query("insert into users(id,email,signup_method) values($1,$2,'email')",[owner,`${owner}@test.invalid`]);
   const project=randomUUID();await pool.query("insert into generation_projects(id,owner_id,prompt) values($1,$2,'test')",[project,owner]);
   const id=await scalar("select enqueue_generation($1,$2,0,'pose',0.25,100)",[owner,project]);
   const claimed=await scalar("select claim_generation_job('paid-worker')");
   await assert.rejects(scalar("select reserve_deletion('account',$1)",[owner]),/PROCESS_ALREADY_RUNNING/);
   await pool.query("update generation_images set heartbeat_at=now()-interval '1 hour' where id=$1",[id]);
   assert.equal(await scalar('select recover_generation_jobs(1000)'),1);
   assert.equal(await scalar("select claim_generation_job('paid-worker')"),null);
   assert.equal(await scalar('select mutate_generation_job($1,$2,$3)',[id,claimed.lease_token,JSON.stringify({status:'completed',path:'late.png'})]),false);
   assert.equal(await scalar('select mutate_generation_job($1,$2,$3)',[id,claimed.lease_token,JSON.stringify({usage:{output_tokens:100},cost_usd:0.04})]),true);
   const image=(await pool.query('select * from generation_images where id=$1',[id])).rows[0];assert.equal(image.status,'failed');assert.equal(Number(image.reserve_usd),0.25);assert.equal(Number(image.cost_usd),0.04);assert.equal(image.path,null);
  });
  await t.test('legacy queued/running jobs are backfilled before resuming intermediate asset states',async()=>{
   const x=await fixture();
   await pool.query("update assets set status='preprocessing' where id=$1",[x.asset]);
   const id=await scalar("insert into jobs(project_id,status,attempts) values($1,'queued',0) returning id",[x.project]);
   const claimed=await scalar("select claim_localization_job('legacy-worker')");
   assert.equal(claimed.id,id);assert.deepEqual(claimed.asset_ids,[x.asset]);
   assert.equal(await scalar('select status from assets where id=$1',[x.asset]),'uploaded');
   await assert.rejects(pool.query("update assets set status='uploaded' where id=$1",[x.asset]),/PROCESS_ALREADY_RUNNING/);
   await scalar("select finish_localization_job($1,$2,'STOPPED','test',false)",[id,claimed.lease_token]);
   const y=await fixture();
   const stale=await scalar("insert into jobs(project_id,status,attempts,heartbeat_at) values($1,'running',2,now()-interval '1 hour') returning id",[y.project]);
   await scalar('select recover_localization_jobs(1000)');
   assert.equal(await scalar('select status from jobs where id=$1',[stale]),'failed');
   assert.equal(await scalar('select status from assets where id=$1',[y.asset]),'failed');
  });
  await t.test('service-role worker writes remain fenced and artifact cleanup preserves published paths',async()=>{
   const x=await fixture();
   const client=await pool.connect();
   try {
    await client.query('set role service_role');assert.equal(Object.values((await client.query('select backend_schema_ready()')).rows[0])[0],true);
    await client.query("select enqueue_localization_job($1,array['uploaded'])",[x.project]);
    const g=Object.values((await client.query("select claim_localization_job('service-worker')")).rows[0])[0];
    const path=`projects/${x.project}/cleaned/${g.id}/${g.lease_token}/${x.asset}.png`;
    await client.query("select mutate_localization_job($1,$2,'artifact',$3,$4)",[g.id,g.lease_token,x.asset,JSON.stringify({path})]);
    await client.query("select mutate_localization_job($1,$2,'asset',$3,$4)",[g.id,g.lease_token,x.asset,JSON.stringify({status:'completed',cleaned_path:path})]);
    await client.query('select finish_localization_job($1,$2)',[g.id,g.lease_token]);
    assert.ok(!Object.values((await client.query('select orphan_artifact_paths()')).rows[0])[0].includes(path));
    await client.query('update assets set cleaned_path=null where id=$1',[x.asset]);
    assert.ok(Object.values((await client.query('select orphan_artifact_paths()')).rows[0])[0].includes(path));
    await client.query('select mark_orphan_artifacts($1)',[[path]]);
    assert.ok((await client.query('select removed_at from job_artifacts where path=$1',[path])).rows[0].removed_at);
   }
   finally { await client.query('reset role');client.release(); }
  });
  await t.test('generation admission waits for deletion reservation and cannot enqueue after it',async()=>{
   const owner=randomUUID();await pool.query("insert into users(id,email,signup_method) values($1,$2,'email')",[owner,`${owner}@test.invalid`]);
   const project=randomUUID();await pool.query("insert into generation_projects(id,owner_id,prompt) values($1,$2,'test')",[project,owner]);
   const lock=await pool.connect();await lock.query('begin');
   await lock.query("select reserve_deletion('generation',$1)",[project]);
   const concurrent=scalar("select enqueue_generation($1,$2,0,'pose',0.25,100)",[owner,project]).then(()=>({ok:true}),error=>({error}));
   await lock.query('commit');lock.release();assert.match((await concurrent).error.message,/DELETING|NOT_FOUND/);
   assert.equal(await scalar('select count(*)::int from generation_images where project_id=$1',[project]),0);
  });
  await t.test('orphan cleanup advances past the first hundred entries while retaining late-upload manifests',async()=>{
   const seed=(await pool.query('select project_id,job_id,lease_token from job_artifacts limit 1')).rows[0];
   const paths=Array.from({length:101},(_,i)=>`projects/${seed.project_id}/cleaned/${seed.job_id}/${seed.lease_token}/orphan-${i}.png`);
   for(const path of paths) await pool.query('insert into job_artifacts(path,project_id,job_id,lease_token) values($1,$2,$3,$4)',[path,seed.project_id,seed.job_id,seed.lease_token]);
   const first=await scalar('select orphan_artifact_paths()');assert.equal(first.length,100);
   await scalar('select mark_orphan_artifacts($1)',[first]);
   const second=await scalar('select orphan_artifact_paths()');assert.ok(paths.every(path=>first.includes(path)||second.includes(path)));
   assert.equal(await scalar('select count(*)::int from job_artifacts where path=any($1)',[paths]),101);
  });
  await t.test('readiness fails closed when a required RPC is absent',async()=>{
   const client=await pool.connect();
   try {
    await client.query('begin');await client.query('drop function claim_generation_job(text)');
    assert.equal(Object.values((await client.query('select backend_schema_ready()')).rows[0])[0],false);
   } finally { await client.query('rollback');client.release(); }
  });
  await t.test('anonymous and authenticated roles cannot execute internal RPCs',async()=>{
   for(const role of ['anon','authenticated']) for(const name of ['claim_localization_job(text)','reserve_deletion(text,uuid)','mutate_generation_job(uuid,uuid,jsonb)','backend_schema_ready()']) assert.equal(await scalar('select has_function_privilege($1,$2,\'execute\')',[role,name]),false);
   assert.equal(await scalar('select backend_schema_ready()'),true);
  });
 } finally {
  await pool?.end();
  await exec(join(bin,'pg_ctl'),['-D',join(dir,'data'),'-m','immediate','stop']).catch(()=>{});
  await rm(dir,{recursive:true,force:true});
 }
});
