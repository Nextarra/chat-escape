import {test} from 'node:test';import assert from 'node:assert/strict';import {TwitchAdapter} from '../src/twitch.js';
class Socket {static all=[];constructor(url){this.url=url;Socket.all.push(this);}close(){if(!this.closed){this.closed=true;this.onclose?.();}}async emit(type,payload,extra={}){await this.onmessage({data:JSON.stringify({metadata:{message_type:type,message_timestamp:new Date(100000).toISOString(),...extra},payload})});}}
function setup(){Socket.all=[];const statuses=[],chat=[],requests=[],pending=new Map();let timer=0;const timers={setTimeout(fn,ms){pending.set(++timer,{fn,ms});return timer;},clearTimeout(id){pending.delete(id);}};const adapter=new TwitchAdapter({clientId:'client',token:'TEST_TOKEN_NOT_REAL',broadcasterId:'123',userId:'456',onChat:e=>chat.push(e),onStatus:s=>statuses.push(s),WebSocketImpl:Socket,fetchImpl:async(...args)=>{requests.push(args);return {status:202};},timers,clock:()=>100000});adapter.start();return {adapter,statuses,chat,requests,pending,get socket(){return Socket.all.at(-1);}};}
const welcome={session:{id:'session-1',keepalive_timeout_seconds:10}};
const event=(id='m1',text='!join scout')=>({subscription:{type:'channel.chat.message',version:'1'},event:{broadcaster_user_id:'123',chatter_user_id:'888',message_id:id,message:{text}}});
test('requires supplied credentials; does not create or request grants',()=>{assert.throws(()=>new TwitchAdapter({}));});
test('welcome creates documented WebSocket chat subscription and deduplicates deliveries',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);assert.equal(h.requests.length,1);const [url,options]=h.requests[0];assert.equal(url,'https://api.twitch.tv/helix/eventsub/subscriptions');assert.deepEqual(JSON.parse(options.body),{type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:'123',user_id:'456'},transport:{method:'websocket',session_id:'session-1'}});await h.socket.emit('notification',event());await h.socket.emit('notification',event());assert.equal(h.chat.length,1);assert.ok(h.statuses.includes('connected'));h.adapter.stop();});
test('server-directed migration waits for welcome, transfers subscriptions without a new POST',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);const old=h.socket;await old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=opaque'}});assert.equal(old.closed,undefined);await h.socket.emit('session_welcome',{session:{id:'session-2',keepalive_timeout_seconds:10}});assert.equal(old.closed,true);assert.equal(h.requests.length,1);await h.socket.emit('notification',event());await h.socket.emit('notification',event());assert.equal(h.chat.length,1);h.adapter.stop();});
test('unexpected disconnect retries and subscribes a new session; watchdog closes stale connection',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);[...h.pending.values()].find(t=>t.ms===12000).fn();assert.ok(h.statuses.includes('keepalive-timeout'));const retry=[...h.pending.values()].find(t=>t.ms===1000);assert.ok(retry);retry.fn();await h.socket.emit('session_welcome',welcome);assert.equal(h.requests.length,2);h.adapter.stop();});
test('wrong channel, malformed, stale or ordinary chat ignored; no raw error leaks',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);await h.socket.emit('notification',{...event(),event:{...event().event,broadcaster_user_id:'999'}});await h.socket.emit('notification',event('old'),{message_timestamp:new Date(0).toISOString().replace('1970','1969')});await h.socket.emit('notification',event('normal','hello chat'));await h.socket.emit('notification',{});assert.equal(h.chat.length,0);h.adapter.stop();});
test('unsafe reconnect destination rejected without connecting',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);await h.socket.emit('session_reconnect',{session:{reconnect_url:'wss://evil.test/ws'}});assert.ok(h.statuses.includes('adapter-error'));assert.equal(Socket.all.length,1);h.adapter.stop();});
test('subscription authorization errors do not report connected',async()=>{const h=setup();h.adapter.fetchImpl=async()=>({status:401});await h.socket.emit('session_welcome',welcome);assert.ok(h.statuses.includes('authorization-failed'));assert.ok(!h.statuses.includes('connected'));assert.equal(h.adapter.stopped,true);assert.equal(h.pending.size,0);h.adapter.stop();});
test('revocation stops without automatic credential renewal',async()=>{const h=setup();await h.socket.emit('session_welcome',welcome);await h.socket.emit('revocation',{subscription:{status:'authorization_revoked'}});assert.equal(h.adapter.stopped,true);assert.ok(h.statuses.includes('revoked'));assert.equal(h.pending.size,0);});

test('missing welcome closes socket and schedules bounded reconnect',()=>{const h=setup();[...h.pending.values()].find(t=>t.ms===15000).fn();assert.equal(h.socket.closed,true);assert.ok([...h.pending.values()].some(t=>t.ms===1000));h.adapter.stop();});

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
async function replacePendingWelcome(h,pending){
 const old=h.socket;h.adapter.fetchImpl=()=>pending.promise;const completion=old.emit('session_welcome',welcome);
 old.close();[...h.pending.values()].find(t=>t.ms===1000).fn();
 h.adapter.fetchImpl=async()=>({status:202});const replacement=h.socket;await replacement.emit('session_welcome',{session:{id:'new-session',keepalive_timeout_seconds:10}});
 return {old,replacement,completion};
}
test('late old subscription success cannot activate closed socket or close its healthy replacement',async()=>{
 const h=setup(),pending=deferred();const {old,replacement,completion}=await replacePendingWelcome(h,pending);const before=[...h.statuses];
 pending.resolve({status:202});await completion;
 assert.equal(h.adapter.active,replacement);assert.equal(replacement.closed,undefined);assert.equal(old.closed,true);assert.deepEqual(h.statuses,before);
 await replacement.emit('notification',event('new-delivery'));assert.equal(h.chat.length,1);h.adapter.stop();
});
test('late old subscription authorization failure cannot stop a replacement',async()=>{
 const h=setup(),pending=deferred();const {replacement,completion}=await replacePendingWelcome(h,pending);
 pending.resolve({status:401});await completion;assert.equal(h.adapter.active,replacement);assert.equal(h.adapter.stopped,false);assert.ok(!h.statuses.includes('authorization-failed'));h.adapter.stop();
});
test('closed readyState guards subscription completion even before onclose delivery',async()=>{
 const h=setup(),pending=deferred();h.adapter.fetchImpl=()=>pending.promise;const socket=h.socket;socket.readyState=1;const completion=socket.emit('session_welcome',welcome);socket.readyState=3;
 pending.resolve({status:202});await completion;assert.ok(!h.statuses.includes('connected'));assert.notEqual(h.adapter.active,socket);
 [...h.pending.values()].find(t=>t.ms===15000).fn();assert.ok([...h.pending.values()].some(t=>t.ms===1000));h.adapter.stop();
});
test('stop then restart invalidates outstanding subscription and late callbacks',async()=>{
 const h=setup(),pending=deferred();h.adapter.fetchImpl=()=>pending.promise;const old=h.socket;const completion=old.emit('session_welcome',welcome);h.adapter.stop();h.adapter.fetchImpl=async()=>({status:202});h.adapter.start();const replacement=h.socket;await replacement.emit('session_welcome',welcome);
 pending.reject(Error('old transport failed'));await completion;await old.emit('revocation',{});await old.emit('notification',event('old-packet'));
 assert.equal(h.adapter.active,replacement);assert.equal(h.adapter.stopped,false);assert.equal(h.chat.length,0);h.adapter.stop();
});
test('duplicate welcome creates one subscription; pre-welcome chat cannot mutate game',async()=>{
 const h=setup(),pending=deferred();let subscriptions=0;h.adapter.fetchImpl=()=>{subscriptions++;return pending.promise;};await h.socket.emit('notification',event('premature'));
 const first=h.socket.emit('session_welcome',welcome);await h.socket.emit('session_welcome',welcome);assert.equal(subscriptions,1);assert.equal(h.chat.length,0);pending.resolve({status:202});await first;h.adapter.stop();
});
test('old watchdog and old reconnect packets cannot disturb migrated connection',async()=>{
 const h=setup();await h.socket.emit('session_welcome',welcome);const old=h.socket,watchdog=[...h.pending.values()].find(t=>t.ms===12000).fn;
 await old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=1'}});await h.socket.emit('session_welcome',welcome);const replacement=h.socket;watchdog();
 await old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=old'}});
 assert.equal(h.adapter.active,replacement);assert.equal(replacement.closed,undefined);assert.equal(Socket.all.length,2);h.adapter.stop();
});
test('future and over-age notifications dropped; valid current packet carries receive time',async()=>{
 const h=setup();await h.socket.emit('session_welcome',welcome);
 await h.socket.emit('notification',event('future'),{message_timestamp:new Date(100001).toISOString()});await h.socket.emit('notification',event('very-old'),{message_timestamp:new Date(-20001).toISOString()});await h.socket.emit('notification',event('current'));
 assert.equal(h.chat.length,1);assert.equal(h.chat[0].id,'current');assert.equal(h.chat[0].receivedAt,100000);h.adapter.stop();
});
test('failed migration retries a fresh subscription without leaving old connection stranded',async()=>{
 const h=setup();await h.socket.emit('session_welcome',welcome);const old=h.socket;
 await old.emit('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?reconnect=1'}});h.socket.close();assert.equal(old.closed,true);
 [...h.pending.values()].find(t=>t.ms===1000).fn();await h.socket.emit('session_welcome',welcome);assert.equal(h.requests.length,2);assert.equal(h.adapter.active,h.socket);h.adapter.stop();
});
