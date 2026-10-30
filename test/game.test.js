import {test} from 'node:test';import assert from 'node:assert/strict';
import {fresh,reduce,replay,view,ROLES,CLUES} from '../src/game.js';
let counter=0;
function harness(){let state=fresh(),now=1000;const actions=[];return {get state(){return state;},get actions(){return actions;},send(type,extra={},delta=1000){now+=delta;const a={type,now,...extra};actions.push(a);const next=reduce(state,a);state=next.state;return next.result;},chat(user,text,extra={},delta=1000){return this.send('chat',{id:'msg-'+counter++,user,text,run:state.run,...extra},delta);},start(){this.send('start');},join(){for(const r of ROLES)this.chat(r,'!join '+r);},discover(){for(const r of ROLES)this.chat(r,CLUES[r].command);},align(){for(const r of ROLES)this.chat(r,'!vote moon-star-sun');}};}
test('end to end: complementary roles, clues, consensus, synchronized shared reveal',()=>{const h=harness();h.start();h.join();h.discover();assert.equal(h.state.phase,'align');h.align();for(const r of ROLES)h.chat(r,'!charge');assert.equal(h.state.status,'won');assert.equal(h.state.phase,'escaped');assert.equal(h.state.stats.accepted,12);assert.deepEqual(replay(h.actions),h.state);assert.equal(view(h.state).teams.length,3);});
test('one account cannot switch roles or discover another team clue',()=>{const h=harness();h.start();h.chat('one','!join scout');assert.equal(h.chat('one','!join scribe'),'already-joined');assert.equal(h.chat('one','!decode mural'),'wrong-phase');h.chat('one','!scan prism');assert.deepEqual(h.state.clues,['scout']);});
test('duplicates apply once even after cooldown',()=>{const h=harness();h.start();h.chat('a','!join scout',{id:'same'});assert.equal(h.chat('b','!join scribe',{id:'same'}),'duplicate');assert.equal(Object.keys(h.state.players).length,1);});
test('pause freezes gameplay and resume requires fresh delivery',()=>{const h=harness();h.start();h.join();h.send('pause');const before=structuredClone(h.state);assert.equal(h.chat('scout','!scan prism',{id:'paused'}),'inactive');assert.deepEqual(h.state.clues,before.clues);h.start();assert.equal(h.chat('scout','!scan prism',{id:'paused'}),'duplicate');assert.equal(h.chat('scout','!scan prism'),'clue');});
test('reset rejects stale round and old timestamp; clears roles and progress',()=>{const h=harness();h.start();h.join();h.send('reset');h.start();assert.equal(h.chat('old','!join scout',{run:1}),'stale-run');assert.equal(h.chat('old','!join scout',{now:100}),'stale-run');assert.equal(Object.keys(h.state.players).length,0);assert.equal(h.state.run,2);});
test('cooldowns block spam; wrong sequence cannot advance; all roles required',()=>{const h=harness();h.start();h.join();h.discover();h.chat('scout','!vote sun-star-moon');h.chat('scribe','!vote moon-star-sun');h.chat('engineer','!vote moon-star-sun');assert.equal(h.state.phase,'align');assert.equal(h.chat('engineer','!vote sun-star-moon',{},0),'cooldown');h.chat('scout','!vote moon-star-sun');assert.equal(h.state.phase,'charge');});
test('expired charges require renewed participation',()=>{const h=harness();h.start();h.join();h.discover();h.align();h.chat('scout','!charge');h.chat('scribe','!charge',{},13000);h.chat('engineer','!charge');assert.equal(h.state.status,'playing');assert.equal(h.chat('scout','!charge'),'escaped');});
test('malformed, hostile, unknown and overlong commands cannot change puzzle',()=>{const h=harness();h.start();for(const text of ['<img src=x onerror=alert(1)>','!reset','!charge;rm -rf /','x'.repeat(161)])assert.ok(['ignored','invalid'].includes(h.chat('a',text)));assert.equal(h.state.phase,'discover');assert.deepEqual(h.state.players,{});});
test('finite timestamps and known actions enforced',()=>{assert.throws(()=>reduce(fresh(),{type:'chat',now:NaN}));assert.throws(()=>reduce(fresh(),{type:'exec',now:0}));});
test('public view excludes identity, raw events and dedupe IDs',()=>{const h=harness();h.start();h.join();const publicState=view(h.state);assert.equal(publicState.players,undefined);assert.equal(publicState.seen,undefined);assert.equal(JSON.stringify(publicState).includes('msg-'),false);});

const chargeRoom=()=>{const h=harness();h.start();h.join();h.discover();h.align();return h;};
test('out-of-order charges spanning 21 seconds cannot win and replay identically',()=>{
 for(const times of [[100000,101000,80000],[100000,110000,89000]]){const h=chargeRoom();const receivedAt=Math.max(...times);h.chat('scout','!charge',{now:times[0],receivedAt});h.chat('scribe','!charge',{now:times[1],receivedAt});
 assert.equal(Math.max(...times)-Math.min(...times),21000);assert.equal(h.chat('engineer','!charge',{now:times[2],receivedAt}),'out-of-order');assert.equal(h.state.status,'playing');assert.equal(h.state.charges.engineer,undefined);assert.deepEqual(replay(h.actions),h.state);}
});
test('strict 12-second inclusive boundary: 12000ms wins, 12001ms requires fresh charge',()=>{
 for(const span of [12000,12001]){const h=chargeRoom();h.chat('scout','!charge',{now:100000});h.chat('scribe','!charge',{now:101000});const result=h.chat('engineer','!charge',{now:100000+span});assert.equal(result,span===12000?'escaped':'charged');assert.equal(h.state.status,span===12000?'won':'playing');}
});
test('future and old event time cannot poison ordering or produce future charge UI',()=>{
 const h=chargeRoom();assert.equal(h.chat('scout','!charge',{now:200000,receivedAt:100000}),'future-event');assert.equal(h.chat('scout','!charge',{now:50000,receivedAt:170001}),'stale-event');
 assert.equal(h.chat('scout','!charge',{now:100000,receivedAt:100001}),'charged');const team=view(h.state,99000).teams.find(t=>t.role==='scout');assert.equal(team.charged,false);assert.equal(team.chargeSeconds,0);
});
test('delayed pre-resume message rejected even if never delivered while paused',()=>{
 const h=harness();h.start();h.join();h.send('pause',{now:100000});h.send('start',{now:110000});
 assert.equal(h.chat('scout','!scan prism',{now:105000,receivedAt:110001}),'out-of-order');assert.equal(h.state.clues.length,0);assert.equal(h.chat('scout','!scan prism',{now:110001,receivedAt:110001}),'clue');
});
test('controls preserve temporal floor when local clock moves backward; reset cannot admit old events',()=>{
 const h=harness();h.start();h.chat('a','!join scout',{now:100000});h.send('pause',{now:90000});h.send('reset',{now:95000});h.send('start',{now:96000});
 assert.equal(h.state.resetAt,100000);assert.equal(h.chat('b','!join scout',{now:99000,receivedAt:100000}),'stale-run');assert.equal(h.chat('b','!join scout',{now:100001,receivedAt:100001}),'joined');
});
test('messages sharing reset or resume millisecond are conservatively rejected',()=>{
 const h=harness();h.start();h.send('reset',{now:100000});h.send('start',{now:100000});assert.equal(h.chat('a','!join scout',{now:100000,receivedAt:100001}),'stale-run');assert.equal(h.chat('a','!join scout',{now:100001,receivedAt:100001}),'joined');h.send('pause',{now:110000});h.send('start',{now:120000});assert.equal(h.chat('a','!scan prism',{now:120000,receivedAt:120001}),'out-of-order');assert.equal(h.chat('a','!scan prism',{now:120001,receivedAt:120001}),'clue');
});
test('all six arrival orders of charges spread over 21 seconds remain unsolved',()=>{
 const times=[100000,101000,80000];for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){const h=chargeRoom();for(const i of order)h.chat(ROLES[i],'!charge',{now:times[i],receivedAt:101000});assert.equal(h.state.status,'playing');assert.deepEqual(replay(h.actions),h.state);}
});
