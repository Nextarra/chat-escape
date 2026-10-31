import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fresh,view} from '../src/game.js';
import {presentation,roles,tools} from '../public/presentation.js';

// Execute the real polling and render functions, with only the browser DOM and
// fetch transport substituted. No server, Twitch connection, or camera is used.
function harness(file) {
 const nodes=new Map();
 const element=()=>({textContent:'',classList:{add(){},toggle(){}},append(){},replaceChildren(){},setAttribute(){}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 let modeWrites=0,modeText='';
 Object.defineProperty(node('mode'),'textContent',{get:()=>modeText,set:value=>{modeText=value;modeWrites++;}});
 let failure=null;
 const payload={...view(fresh(),1000),mode:'live',connection:'connected'};
 const context=vm.createContext({presentation,roles,tools,location:{pathname:'/'},document:{
  body:element(),getElementById:node,querySelector:node,createElement:element
 },fetch:async()=>{
  if(failure==='network')throw new Error('Temporary transport failure');
  if(failure==='http')return {ok:false};
  return {ok:true,json:async()=>structuredClone(payload)};
 }});
 let source=readFileSync(new URL('../public/'+file,import.meta.url),'utf8').replace(/^import[^\n]*\n/,'');
 source=source.slice(0,source.indexOf(file==='app.js'?'async function post(':'await refresh();setInterval'));
 vm.runInContext(source,context);
 return {node,payload,refresh:()=>vm.runInContext('refresh()',context),fail:value=>{failure=value;},
  cached:()=>vm.runInContext(file==='app.js'?'state':'previous',context),get modeWrites(){return modeWrites;}};
}

for(const file of ['app.js','overlay.js']) {
 test(file+' skips repaint for repeated identical successful polls',async()=>{
  const h=harness(file);await h.refresh();const rendered=h.modeWrites;
  assert.match(h.node('mode').textContent,/CONNECTED/);
  await h.refresh();await h.refresh();assert.equal(h.modeWrites,rendered);
 });
 for(const failure of ['network','http'])test(file+' restores unchanged state after '+failure+' failure',async()=>{
  const h=harness(file);await h.refresh();const cached=h.cached();
  const objective=h.node('objective').textContent,action=h.node('next-action').textContent,countdown=h.node('countdown').textContent;
  h.fail(failure);await h.refresh();assert.match(h.node('mode').textContent,/OFFLINE/);
  assert.equal(h.cached(),cached,'Keep game state available during polling failure');
  const writes=h.modeWrites;h.fail(null);await h.refresh();
  assert.equal(h.modeWrites,writes+1);assert.match(h.node('mode').textContent,/CONNECTED/);
  if(file==='app.js')assert.equal(h.node('feedback').textContent,'');
  else {
   assert.equal(h.node('objective').textContent,objective);
   assert.equal(h.node('next-action').textContent,action);
   assert.equal(h.node('countdown').textContent,countdown);
  }
  await h.refresh();assert.equal(h.modeWrites,writes+1,'Resume unchanged-state optimization after recovery');
 });
}

test('controller recovery preserves newer unrelated feedback',async()=>{
 const h=harness('app.js');await h.refresh();h.fail('network');await h.refresh();
 h.node('feedback').textContent='Operation failed; current state preserved. Check journal storage.';
 h.fail(null);await h.refresh();assert.match(h.node('mode').textContent,/CONNECTED/);
 assert.equal(h.node('feedback').textContent,'Operation failed; current state preserved. Check journal storage.');
});
