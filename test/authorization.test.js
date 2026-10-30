import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AuthorizedSession} from '../src/authorization.js';
test('missing credentials fail before any validation request',()=>{
 let called=false;
 assert.throws(()=>new AuthorizedSession({fetchImpl:()=>{called=true;}}),/explicit Twitch credentials/);
 assert.equal(called,false);
});
function fixture(responder) {
 const tasks=new Map();let seq=0,starts=0,stops=0;const statuses=[],requests=[];
 const timers={setTimeout(fn,ms){const id=++seq;tasks.set(id,{fn:()=>{tasks.delete(id);return fn();},ms});return id;},clearTimeout(id){tasks.delete(id);}};
 const valid={client_id:'fixture-client',user_id:'123',login:'nextarra',scopes:['user:read:chat'],expires_in:7200};
 const session=new AuthorizedSession({clientId:'fixture-client',token:'FAKE_TEST_TOKEN',userId:'123',broadcasterId:'123',expectedLogin:'nextarra',timers,onStatus:s=>statuses.push(s),
  fetchImpl:async(url,options)=>{requests.push({url,options});return responder?responder(valid):{status:200,json:async()=>valid};},
  AdapterImpl:class {constructor(c){this.c=c;}start(){starts++;this.c.onStatus('connected');}stop(s){stops++;this.c.onStatus(s);}}
 });
 return {session,tasks,statuses,requests,get starts(){return starts;},get stops(){return stops;}};
}
test('validates before connection, checks exact identity and schedules before one hour',async()=>{
 const f=fixture();await f.session.start();assert.equal(f.starts,1);assert.deepEqual(f.statuses,['validating','connected']);
 assert.equal(f.requests[0].url,'https://id.twitch.tv/oauth2/validate');
 assert.equal(f.requests[0].options.headers.Authorization,'OAuth FAKE_TEST_TOKEN');
 const hourly=[...f.tasks.values()].find(t=>t.ms===3500000);assert.ok(hourly);await hourly.fn();assert.equal(f.requests.length,2);assert.equal(f.starts,1);f.session.stop();assert.equal(f.tasks.size,0);
});
for(const [name,delta] of [['wrong client',{client_id:'other'}],['wrong user',{user_id:'999'}],['wrong login',{login:'other'}],['missing scope',{scopes:[]}],['expired',{expires_in:0}],['malformed expiry',{expires_in:'7200'}]])test('rejects '+name+' without connecting',async()=>{
 const f=fixture(valid=>({status:200,json:async()=>({...valid,...delta})}));await f.session.start();assert.equal(f.starts,0);assert.equal(f.statuses.at(-1),'authorization-failed');assert.equal(f.tasks.size,0);
});
test('revoked hourly validation stops active connection',async()=>{
 let count=0;const f=fixture(valid=>++count===1?{status:200,json:async()=>valid}:{status:401});await f.session.start();await [...f.tasks.values()].find(t=>t.ms===3500000).fn();assert.equal(f.stops,1);assert.equal(f.statuses.at(-1),'authorization-failed');assert.equal(f.tasks.size,0);
});
test('network errors never expose token or upstream error',async()=>{
 const f=fixture(()=>{throw Error('FAKE_TEST_TOKEN private response');});await f.session.start();assert.equal(f.starts,0);assert.equal(f.statuses.at(-1),'authorization-failed');assert.ok(!JSON.stringify(f.statuses).includes('FAKE_TEST_TOKEN'));
});
test('stop during validation cannot connect after late response',async()=>{
 let finish;const f=fixture(valid=>new Promise(resolve=>{finish=()=>resolve({status:200,json:async()=>valid});}));const pending=f.session.start();f.session.stop();finish();await pending;assert.equal(f.starts,0);assert.equal(f.tasks.size,0);
});
test('expiry ends active connection even if validation is still pending',async()=>{
 const f=fixture();await f.session.start();[...f.tasks.values()].find(t=>t.ms===7200000).fn();assert.equal(f.statuses.at(-1),'authorization-expired');assert.equal(f.stops,1);assert.equal(f.tasks.size,0);
});
