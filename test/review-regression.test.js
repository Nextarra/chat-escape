import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AuthorizedSession} from '../src/authorization.js';
import {TwitchAdapter} from '../src/twitch.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function timers(){let serial=0;const pending=new Map();return {pending,setTimeout(fn,ms){pending.set(++serial,{fn,ms});return serial;},clearTimeout(id){pending.delete(id);},async fire(id){const timer=pending.get(id);pending.delete(id);await timer.fn();}};}
const valid=()=>({client_id:'mock-client',user_id:'123',login:'nextarra',scopes:['user:read:chat'],expires_in:7200});
const response=(data=valid())=>({status:200,json:async()=>data});
function supervisor(fetchImpl=async()=>response()){
 const time=timers(),statuses=[],adapters=[],requests=[];
 class Adapter {constructor(config){this.config=config;this.starts=0;this.stops=[];adapters.push(this);}start(){this.starts++;this.config.onStatus('connected');}stop(status){this.stops.push(status);this.config.onStatus(status);}}
 const session=new AuthorizedSession({clientId:'mock-client',token:'FAKE_TEST_ONLY',userId:'123',broadcasterId:'123',expectedLogin:'nextarra',onStatus:s=>statuses.push(s),onChat:()=>{},AdapterImpl:Adapter,timers:time,fetchImpl:async(...args)=>{requests.push(args);return fetchImpl(...args);}});
 return {session,time,statuses,adapters,requests};
}

test('review: 20,001 unrelated commands never consume live adapter capacity',async()=>{
 const time=timers(),statuses=[],chat=[];let socket;
 class Socket {constructor(){socket=this;}close(){this.onclose?.();}}
 const adapter=new TwitchAdapter({clientId:'mock',token:'FAKE_TEST_ONLY',broadcasterId:'123',userId:'123',onChat:e=>chat.push(e),onStatus:s=>statuses.push(s),WebSocketImpl:Socket,fetchImpl:async()=>({status:202}),timers:time,clock:()=>100000});
 const emit=(type,payload)=>socket.onmessage({data:JSON.stringify({metadata:{message_type:type,message_timestamp:new Date(100000).toISOString()},payload})});
 const notification=(id,text)=>({subscription:{type:'channel.chat.message',version:'1'},event:{broadcaster_user_id:'123',chatter_user_id:'888',message_id:id,message:{text}}});
 adapter.start();await emit('session_welcome',{session:{id:'s',keepalive_timeout_seconds:10}});
 for(let i=0;i<20001;i++)await emit('notification',notification('unknown-'+i,'!unrelated-bot-command'));
 assert.equal(adapter.stopped,false);assert.equal(adapter.seen.size,0);assert.equal(chat.length,0);
 await emit('notification',notification('real-command','  !JOIN   Scout  '));
 await emit('notification',notification('real-command','  !JOIN   Scout  '));
 assert.equal(chat.length,1);assert.equal(adapter.seen.size,1);assert.ok(!statuses.includes('capacity'));adapter.stop();
});

test('review: supervisor does not start transport before successful validation',async()=>{
 const wait=deferred(),h=supervisor(()=>wait.promise);const startup=h.session.start();
 assert.deepEqual(h.statuses,['validating']);assert.equal(h.adapters.length,0);
 wait.resolve(response());await startup;assert.equal(h.adapters.length,1);assert.equal(h.adapters[0].starts,1);
 assert.equal(h.requests[0][0],'https://id.twitch.tv/oauth2/validate');
 assert.ok([...h.time.pending.values()].some(t=>t.ms===3500000));h.session.stop();assert.equal(h.time.pending.size,0);
});

test('review: invalid identity, scope, expiry and responses fail closed without transport',async()=>{
 for(const change of [{client_id:'other'},{user_id:'456'},{login:'wrong-user'},{scopes:[]},{expires_in:0},{expires_in:-1},{expires_in:'7200'},{expires_in:Infinity}]){
  const h=supervisor(async()=>response({...valid(),...change}));await h.session.start();assert.equal(h.adapters.length,0);assert.equal(h.session.stopped,true);assert.equal(h.statuses.at(-1),'authorization-failed');assert.equal(h.time.pending.size,0);
 }
 for(const bad of [async()=>({status:401}),async()=>({status:200,json:async()=>{throw Error('bad JSON')}}),async()=>{throw Error('offline')}]){
  const h=supervisor(bad);await h.session.start();assert.equal(h.adapters.length,0);assert.equal(h.statuses.at(-1),'authorization-failed');
 }
});

test('review: late first-generation fetch cannot affect a restarted authorized session',async()=>{
 const old=deferred();let count=0;const h=supervisor(()=>++count===1?old.promise:Promise.resolve(response()));
 const first=h.session.start();h.session.stop();await h.session.start();const active=h.adapters[0];
 old.resolve(response({...valid(),login:'wrong-user'}));await first;
 assert.equal(h.adapters.length,1);assert.equal(h.session.adapter,active);assert.equal(h.session.stopped,false);assert.equal(active.stops.length,0);h.session.stop();
});

test('review: late response JSON cannot resurrect a stopped authorization session',async()=>{
 const json=deferred(),entered=deferred();const h=supervisor(async()=>({status:200,json:()=>{entered.resolve();return json.promise;}}));
 const startup=h.session.start();await entered.promise;h.session.stop();json.resolve(valid());await startup;
 assert.equal(h.adapters.length,0);assert.equal(h.time.pending.size,0);assert.equal(h.statuses.at(-1),'stopped');
});

test('review: periodic validation failure stops connected transport and all timers',async()=>{
 let count=0;const h=supervisor(async()=>++count===1?response():{status:401});await h.session.start();
 await h.time.fire(h.session.validationTimer);
 assert.equal(h.session.stopped,true);assert.deepEqual(h.adapters[0].stops,['authorization-failed']);assert.equal(h.time.pending.size,0);assert.equal(h.statuses.at(-1),'authorization-failed');
});

test('review: expiration wins over an outstanding successful hourly validation',async()=>{
 const later=deferred();let count=0;const h=supervisor(()=>++count===1?Promise.resolve(response()):later.promise);await h.session.start();
 const refresh=h.time.fire(h.session.validationTimer);await h.time.fire(h.session.expiryTimer);later.resolve(response());await refresh;
 assert.equal(h.session.stopped,true);assert.equal(h.session.adapter,null);assert.equal(h.adapters.length,1);assert.deepEqual(h.adapters[0].stops,['authorization-expired']);assert.equal(h.time.pending.size,0);
});

test('review: terminal adapter status cancels validation without restarting transport',async()=>{
 for(const status of ['revoked','authorization-failed','capacity']){
  const h=supervisor();await h.session.start();h.adapters[0].config.onStatus(status);
  assert.equal(h.session.stopped,true);assert.equal(h.time.pending.size,0);assert.equal(h.statuses.at(-1),status);assert.equal(h.adapters.length,1);
 }
});
