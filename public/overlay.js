import {presentation,roles,tools} from './presentation.js';
const $=id=>document.getElementById(id);const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;if(['◈','⌁','ϟ'].includes(text))n.setAttribute('aria-hidden','true');return n;};let previous,polling=false,pollFailed=false;
function render(s){const p=presentation(s);const solo=s.playMode==='solo';document.body.classList.toggle('won',s.status==='won');document.body.classList.toggle('paused',s.status==='paused');
 document.querySelector('.account-note').textContent=solo?'SOLO: 1 real account. Switch roles manually. 30-second final window.':'3 real accounts needed: streamer + 2 viewers. One locked role per account.';
 document.querySelector('.victory-banner strong').textContent=solo?'SOLO EXPEDITION COMPLETE.':'WE MADE IT HOME.';
 document.querySelector('.victory-banner span').textContent=solo?'One explorer completed all three stations.':'Three teams. Every signal mattered.';
 document.querySelector('.waiting-banner span').textContent=solo?'One explorer can bring the stars back.':'Three teams will bring the stars back.';
 $('mode').textContent=(s.mode==='fixture'?'FIXTURE SIMULATION / NO TWITCH':`TWITCH / ${s.connection.toUpperCase()}`)+' / '+(solo?'SOLO EXPEDITION':'COOPERATIVE');
 $('status').textContent=s.status.toUpperCase();$('run').textContent=String(s.run).padStart(2,'0');$('phase').textContent={discover:'01 / DISCOVER',align:'02 / ALIGN',charge:'03 / SYNCHRONIZE',escaped:'EXPEDITION COMPLETE'}[s.phase];
 if($('objective').textContent!==p.objective)$('objective').textContent=p.objective;$('next-action').textContent=p.action;$('progress').textContent=p.progress;$('countdown').textContent=p.countdown;$('countdown').classList.toggle('running',s.phase==='charge'&&s.status==='playing');
 $('teams').replaceChildren(...p.commands.map(t=>{const card=el('article','','hud-team');const title=el('div','','team-title');title.append(el('span',tools[t.role][0]),el('strong',t.role.toUpperCase()),el('span',solo?(s.teams.find(r=>r.role===t.role).count?'Active role':'Inactive role'):`${s.teams.find(r=>r.role===t.role).count} viewer${s.teams.find(r=>r.role===t.role).count===1?'':'s'}`,'viewer-count'));card.append(title,el('code',t.command),el('small',t.status));return card;}));
 $('vote-options').hidden=s.phase!=='align';$('last-action').textContent='LAST SIGNAL · '+(s.events.at(-1)||'Waiting for the streamer to begin.');
 $('clues').replaceChildren(...roles.map(role=>{const c=s.clues.find(c=>c.role===role),card=el('article','',c?'found':'');card.append(el('strong',tools[role][1]),el('p',c?c.clue:'Fragment unrecovered. '+tools[role][2]));return card;}));
 $('room-title').textContent=s.status==='paused'?'The expedition is on hold.':s.status==='ready'?'The gate is sleeping.':'The stars are listening.';
 $('footer-help').textContent=s.status==='won'?'EVERY TEAM BROUGHT US HOME':s.phase==='charge'?'Countdown begins with the first team charge.':'New viewer? Join one role, then follow your team command.';
 if(solo)$('footer-help').textContent=s.status==='won'?'SOLO COMPLETE / ONE EXPLORER':'SOLO / Switch with !join; clues and votes stay. 30-second final window.';
}
async function refresh(){
 if(polling)return;polling=true;
 try{
  const r=await fetch('/api/state');if(!r.ok)throw Error();const s=await r.json();
  if(pollFailed||JSON.stringify(s)!==JSON.stringify(previous)){previous=s;render(s);}
  pollFailed=false;
 }catch{pollFailed=true;$('mode').textContent='OFFLINE · RECONNECTING';$('objective').textContent='Connection interrupted.';$('next-action').textContent='Wait for the streamer to reconnect and resume.';$('countdown').textContent='OFFLINE';}
 finally{polling=false;}
}
await refresh();setInterval(refresh,500);
