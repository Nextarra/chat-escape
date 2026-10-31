import {presentation,roles,tools,soloReplaySteps} from './presentation.js';
const $=id=>document.getElementById(id);const overlay=location.pathname==='/overlay';if(overlay)document.body.classList.add('overlay');
let state,busy=false,polling=false,replayActive=false,pollFailed=false,renderedRun;
const connectionWarning='Server unavailable. Waiting to recover saved expedition.';
function el(tag,text,className){const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;if(className==='team-icon')n.setAttribute('aria-hidden','true');return n;}
async function refresh(){
 if(polling)return;polling=true;
 try{
  const r=await fetch('/api/state');if(!r.ok)throw Error();const next=await r.json();
  if(!pollFailed&&JSON.stringify(next)===JSON.stringify(state))return;
  state=next;render();
  if(pollFailed&&$('feedback').textContent===connectionWarning)$('feedback').textContent='';
  pollFailed=false;
 }catch{pollFailed=true;$('mode').textContent='OFFLINE • RECONNECTING';$('feedback').textContent=connectionWarning;}
 finally{polling=false;}
}
function render(){
 $('mode').textContent=state.mode==='fixture'?'FIXTURE SIMULATION • NO TWITCH':`TWITCH • ${state.connection.toUpperCase()}`;
 $('simulator').hidden=state.mode!=='fixture';$('run').textContent=String(state.run).padStart(2,'0');$('status').textContent=state.status.toUpperCase();
 const solo=state.playMode==='solo';
 if(renderedRun!==state.run){$('play-mode').value=state.playMode??'coop';renderedRun=state.run;}
 document.querySelector('.mission h2').textContent=solo?'Every station matters.':'Every team matters.';
 $('expedition-mode').textContent=solo?'SOLO EXPEDITION':'COOPERATIVE EXPEDITION';
 $('replay-help').textContent=solo?'Replay uses one synthetic explorer. No real Twitch chat.':'Replay uses three synthetic viewers. No real Twitch chat.';
 document.querySelector('.quick-requirement').textContent=solo?'1 real account. Switch roles manually; progress stays. Final charge window: 30 seconds.':'3 real accounts: streamer + 2 viewers. One locked role each.';
 $('mode-help').textContent=solo?'Solo expedition: the first account to join owns this run. Use !join to switch stations. Other accounts cannot join until New expedition. Changing mode starts a fresh run.':'3 real accounts: streamer + 2 viewers, one per team. Role switching is locked; one account cannot play every part.';
 const phase=state.phase;document.body.classList.toggle('won',phase==='escaped');$('phase').textContent=({discover:'01 / DISCOVER',align:'02 / ALIGN',charge:'03 / SYNCHRONIZE',escaped:'EXPEDITION COMPLETE'})[phase];
 for(const r of ['discover','align','charge'])$('step-'+r).classList.toggle('active',r===phase||phase==='escaped');
 $('objective').textContent=state.status==='ready'?'The room is waiting. Streamer: start the expedition.':state.status==='paused'?'Expedition paused. Signals are frozen until the streamer resumes.':({discover:'Each team: investigate your device to recover one fragment.',align:'Combine the clues. All three teams must vote for the same correct sequence.',charge:'Send !charge from all three teams within 12 seconds.',escaped:'YOU ESCAPED • Every team brought us home.'})[phase];
 const p=presentation(state);$('quick-title').textContent=p.objective;$('quick-action').textContent=p.action;document.querySelector('.join-commands').replaceChildren(...p.commands.map(t=>el('code',t.command)));document.querySelector('.join-commands').setAttribute('aria-label','Current team commands');
 if(solo){$('objective').textContent=p.objective+' '+p.action;document.querySelector('.victory-banner strong').textContent='SOLO EXPEDITION COMPLETE.';document.querySelector('.victory-banner span').textContent='One explorer completed all three stations.';}else{document.querySelector('.victory-banner strong').textContent='WE MADE IT HOME.';document.querySelector('.victory-banner span').textContent='Every team brought us home.';}
 const teams=$('teams');teams.replaceChildren();for(const t of state.teams){const row=el('div','','team');row.append(el('div',tools[t.role][0],'team-icon'));const desc=el('div','');desc.append(el('strong',t.role+(solo?' station':' team')),el('small',`${solo?(t.count?'Active role':'Inactive role'):t.count+' viewer'+(t.count===1?'':'s')} • ${phase==='align'?'!vote [sequence]':phase==='charge'?'!charge':tools[t.role][2]}`));row.append(desc,el('span',phase==='charge'?(t.charged?`Charged • ${t.chargeSeconds}s`:'Waiting'):phase==='align'?(t.vote||'No vote'):state.clues.some(c=>c.role===t.role)?'Found ✓':'Listening','team-status'));teams.append(row);}
 $('count').textContent=state.clues.length+' / 3';$('clues').replaceChildren();for(const r of roles){const found=state.clues.find(c=>c.role===r);const card=el('article','',`clue ${found?'':'locked'}`);card.append(el('small',tools[r][1]+' / '+r),el('p',found?found.clue:'Unrecovered. '+tools[r][2]));$('clues').append(card);}
 $('events').replaceChildren(...state.events.map(t=>el('li',t)));$('stats').textContent=`${state.stats.accepted} accepted • ${state.stats.duplicate} duplicates blocked • ${state.stats.rejected} rejected`;
 $('instructions').textContent=phase==='align'?'Use !vote moon-star-sun, !vote sun-star-moon or !vote star-moon-sun. Your latest vote represents your team. Every team must align.':phase==='charge'?'All three teams: send !charge within the same 12-second window. Expired charges clear automatically.':phase==='escaped'?'Three teams, three perspectives, one way home. Start a new expedition to play again.':'Join with !join scout, !join scribe or !join engineer. Your role stays locked for this expedition.';
 if(solo)$('instructions').textContent=p.action+' Use !join scout, !join scribe or !join engineer to switch. Only the current station receives your vote or charge.';
}
async function post(path,body){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');await refresh();return data;}
async function control(type,extra={}){if(busy)return;busy=true;try{const data=await post('control',{type,...extra});$('feedback').textContent=data.result;}catch(e){$('feedback').textContent=e.message;}finally{busy=false;}}
$('start').onclick=()=>control('start');$('pause').onclick=()=>control('pause');let pendingMode;
$('reset').onclick=()=>{pendingMode=$('play-mode').value;$('reset-description').textContent=`Start a new ${pendingMode==='solo'?'solo':'cooperative'} expedition? All progress and players will be cleared.`;$('reset-dialog').showModal();};
$('cancel-reset').onclick=()=>$('reset-dialog').close();
$('confirm-reset').onclick=()=>{$('reset-dialog').close();control('reset',{playMode:pendingMode});};
$('chat').onsubmit=async e=>{e.preventDefault();try{const data=await post('chat',{id:crypto.randomUUID(),user:$('user').value,text:$('message').value,run:state.run});$('feedback').textContent='Fixture: '+data.result;}catch(e){$('feedback').textContent=e.message;}};
$('replay').onclick=async()=>{if(replayActive)return;replayActive=true;$('replay').disabled=true;try{await post('control',{type:'reset'});await post('control',{type:'start'});const run=state.run;const steps=state.playMode==='solo'?soloReplaySteps:[['nova','!join scout'],['echo','!join scribe'],['flux','!join engineer'],['nova','!scan prism'],['echo','!decode mural'],['flux','!tune radio'],['nova','!vote moon-star-sun'],['echo','!vote moon-star-sun'],['flux','!vote moon-star-sun'],['nova','!charge'],['echo','!charge'],['flux','!charge']];for(const [user,text]of steps){if(state.run!==run||state.status!=='playing')throw Error('Replay stopped by streamer control.');const data=await post('chat',{id:crypto.randomUUID(),user,text,run});if(!['joined','clue','voted','charged','escaped'].includes(data.result))throw Error('Replay interrupted: '+data.result);$('feedback').textContent=`SIMULATED ${user}: ${text} → ${data.result}`;await new Promise(r=>setTimeout(r,950));}}catch(e){$('feedback').textContent=e.message;}finally{replayActive=false;$('replay').disabled=false;}};
await refresh();setInterval(refresh,700);
