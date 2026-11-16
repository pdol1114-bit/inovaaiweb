// New FEM project only; synthetic accounts are deleted, no payment APIs called.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const cfg=JSON.parse(readFileSync('/tmp/fem-beta-supabase-keys.json','utf8'));
assert.equal(new URL(cfg.url).hostname,'dkvshlxfvzpdmbfkmirz.supabase.co');
const web=process.env.FEM_BETA_CHECK_WEB||'http://localhost:3017';
const admin=createClient(cfg.url,cfg.secret,{auth:{persistSession:false,autoRefreshToken:false}});
const created=[],checks=[];const ok=n=>{checks.push(n);console.log('PASS',n)};
async function session(){
 const password=randomUUID()+randomUUID(),email=`beta-check-${randomUUID()}@fem-test.invalid`;
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(error,null);created.push(data.user.id);
 const jar=new Map(),client=createServerClient(cfg.url,cfg.publishable,{cookieOptions:{name:'sb-fem-auth-token'},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:list=>list.forEach(({name,value})=>jar.set(name,value))}});
 assert.equal((await client.auth.signInWithPassword({email,password})).error,null);
 return {id:data.user.id,client,cookie:()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')};
}
const call=(p,u,init={})=>fetch(web+p,{...init,headers:{...init.headers,...(u?{Cookie:u.cookie()}:{}),Origin:new URL(web).origin}});
try{
 const a=await session(),b=await session();
 assert.equal((await call('/api/fem/jobs',null,{method:'POST',body:'{}'})).status,401);ok('unauthenticated request refused');
 let state=await (await call('/api/fem/jobs',a)).json();assert.deepEqual([state.authenticated,state.subscribed,state.entitled,state.accessMode,state.quota?.remaining],[true,false,true,'free_beta',40]);ok('free beta grants 40 runs without paid subscription');
 const cad=readFileSync('/tmp/fem-beta-samples/box.step'),body={requestKey:randomUUID(),fileName:'box.step',fileSize:cad.length,settings:{size:5,strategy:'hex'},userId:b.id};
 const submit=()=>call('/api/fem/jobs',a,{method:'POST',headers:{'Content-Type':'application/json','X-Fem-User-Id':b.id},body:JSON.stringify(body)});
 let r=await submit(),j=await r.json();assert.equal(r.status,201,JSON.stringify(j));const id=j.id;assert.equal(j.upload.mode,'direct');
 assert.equal((await fetch(j.upload.url,{method:'PUT',headers:j.upload.headers,body:cad})).ok,true);assert.equal((await call(`/api/fem/jobs/${id}/start`,a,{method:'POST'})).ok,true);
 const deadline=Date.now()+300000;let view;
 do{r=await call(`/api/fem/jobs/${id}`,a);assert.equal(r.status,200);view=await r.json();if(['completed','failed','canceled'].includes(view.status))break;await new Promise(f=>setTimeout(f,1000));}while(Date.now()<deadline);
 assert.equal(view.status,'completed',JSON.stringify(view));assert.equal(view.result,'success');ok('real cloud mesh through authenticated web');
 assert.equal((await call(`/api/fem/jobs/${id}`,b)).status,404);ok('ownership and forged identity protection');
 for(const format of ['inp','msh']){r=await call(`/api/fem/jobs/${id}/download?format=${format}`,a);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),view.artifacts[format].sha256);}ok('download hashes match actual engine');
 r=await call(`/api/fem/jobs/${id}/preview`,a);assert.equal(r.status,200);assert.ok((await r.text()).length>100);ok('actual preview served');
 r=await submit();j=await r.json();assert.equal(r.status,200);assert.equal(j.id,id);state=await (await call('/api/fem/jobs',a)).json();assert.equal(state.quota.used,1);ok('duplicate request consumes one run');
 const rpc={p_user_id:a.id,p_plan:'fem_pro',p_file_name:'quota-check.step',p_file_format:'STEP',p_file_size_bytes:1,p_settings:{},p_month_start:new Date(Date.now()+9*3600000).toISOString().slice(0,7)+'-01T00:00:00+09:00',p_monthly_limit:40};
 const rows=await Promise.all(Array.from({length:45},()=>admin.rpc('fem_reserve_job',{...rpc,p_request_key:randomUUID()})));for(const x of rows)assert.equal(x.error,null);assert.equal(rows.filter(x=>x.data.kind==='created').length,39);assert.equal(rows.filter(x=>x.data.kind==='quota_exceeded').length,6);
 r=await call('/api/fem/jobs',a,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,requestKey:randomUUID()})});assert.equal(r.status,429);ok('concurrent quota exactly 40; next web run rejected');
 assert.notEqual((await a.client.rpc('fem_reserve_job',{...rpc,p_request_key:randomUUID()})).error,null);ok('browser role cannot reserve directly');
}finally{
 for(const id of created)assert.equal((await admin.auth.admin.deleteUser(id)).error,null);
 const c=await admin.from('fem_jobs').select('id',{count:'exact',head:true}).in('user_id',created);assert.equal(c.count,0);
 writeFileSync('/tmp/fem-beta-session-check.json',JSON.stringify({checks,syntheticUsersDeleted:created.length,remainingSyntheticJobs:c.count,checkedAt:new Date().toISOString()},null,2));console.log('CLEANUP',created.length,'synthetic users deleted');
}
