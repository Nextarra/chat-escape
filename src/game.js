export const ROLES = ['scout', 'scribe', 'engineer'];
export const CLUES = {
 scout: {command:'!scan prism', title:'Prism telescope', clue:'The moon rises before the star.'},
 scribe: {command:'!decode mural', title:'Ancient mural', clue:'The star stands between moon and sun.'},
 engineer: {command:'!tune radio', title:'Broken radio', clue:'The sun closes the sequence.'}
};
export const fresh = (run = 1, playMode = 'coop') => ({version:1,run,playMode,status:'ready',phase:'discover',players:{},clues:[],votes:{},charges:{},seen:[],last:{},events:[],stats:{accepted:0,duplicate:0,rejected:0},startedAt:null,finishedAt:null,resetAt:0,lastEventAt:0,playAfterAt:null});
export const chargeWindow = s => s.playMode==='solo'?30000:12000;
const record = (s, text) => {s.events.push(text); s.events=s.events.slice(-12);};
export function reduce(input, action) {
 const s=structuredClone(input); const {type,now}=action;
 if(!Number.isFinite(now)||now<0) throw new Error('Invalid event time');
 const controlTime=Math.max(now,s.lastEventAt??0);
 if(type==='reset') {
   const playMode=action.playMode??s.playMode??'coop';
   if(!['coop','solo'].includes(playMode))throw new Error('Invalid expedition mode');
   return {state:{...fresh(s.run+1,playMode),resetAt:controlTime,lastEventAt:controlTime},result:'reset'};
 }
 if(type==='start') {s.lastEventAt=controlTime; if(s.status==='ready'){s.status='playing';s.playAfterAt=controlTime;s.startedAt=controlTime;record(s,'The observatory wakes. Choose your team.');} else if(s.status==='paused'){s.status='playing';s.playAfterAt=controlTime;record(s,'Expedition resumed.');} return {state:s,result:s.status}; }
 if(type==='pause') {s.lastEventAt=controlTime;if(s.status==='playing'){s.status='paused';record(s,'Expedition paused by streamer.');}return {state:s,result:s.status};}
 if(type!=='chat') throw new Error('Unknown action');
 const {id,user,text,run}=action;
 const reject=(result)=>{s.stats.rejected++;return {state:s,result};};
 if(typeof id!=='string'||!id||id.length>160||typeof user!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(user)||typeof text!=='string'||text.length>160) return reject('invalid');
 if(run!==s.run||now<s.resetAt||(s.run>1&&now===s.resetAt)) return reject('stale-run');
 if(s.seen.includes(id)){s.stats.duplicate++;return {state:s,result:'duplicate'};}
 s.seen.push(id); // bounded run: refuse more events instead of evicting dedupe IDs
 if(s.seen.length>20000){s.seen.pop();return reject('capacity');}
 if(s.status!=='playing') return reject('inactive');
 const receivedAt=action.receivedAt??now;
 if(!Number.isFinite(receivedAt)||receivedAt<0)return reject('invalid-time');
 if(now>receivedAt)return reject('future-event');
 if(receivedAt-now>120000)return reject('stale-event');
 if(now<(s.lastEventAt??0)||(s.playAfterAt!==null&&now<=s.playAfterAt))return reject('out-of-order');
 const cmd=text.trim().toLowerCase().replace(/\s+/g,' ');
 if(!/^!(join (scout|scribe|engineer)|scan prism|decode mural|tune radio|vote (moon-star-sun|sun-star-moon|star-moon-sun)|charge)$/.test(cmd)) return reject('ignored');
 if(s.last[user]!==undefined&&now-s.last[user]<800) return reject('cooldown');
 if(cmd.startsWith('!join ')) {
   if(s.playMode==='solo') {
     if(Object.keys(s.players).length&&!s.players[user])return reject('solo-occupied');
     if(s.players[user]===cmd.split(' ')[1])return reject('already-joined');
   } else if(s.players[user]) return reject('already-joined');
   if(Object.keys(s.players).length>=2000) return reject('room-full');
   s.players[user]=cmd.split(' ')[1];s.lastEventAt=now;s.last[user]=now;s.stats.accepted++;return {state:s,result:'joined'};
 }
 const role=s.players[user];if(!role)return reject('join-first');
 let result='wrong-phase';
 if(s.phase==='discover'&&cmd===CLUES[role].command){
   if(s.clues.includes(role)) return reject('already-found');
   s.clues.push(role);record(s,`${role} team found a fragment: ${CLUES[role].clue}`);result='clue';
   if(s.clues.length===3){s.phase='align';record(s,s.playMode==='solo'?'All fragments found. Switch roles and set an orbit vote at each station.':'All fragments found. Each team must agree on an orbit sequence.');}
 }else if(s.phase==='align'&&cmd.startsWith('!vote ')){
   s.votes[role]=cmd.slice(6);result='voted';
   if(ROLES.every(r=>s.votes[r]==='moon-star-sun')){s.phase='charge';record(s,s.playMode==='solo'?'Orbits aligned. Switch roles and charge all three stations within 30 seconds.':'Orbits aligned. Three teams must charge the gate within 12 seconds.');}
 }else if(s.phase==='charge'&&cmd==='!charge'){
   s.charges=Object.fromEntries(Object.entries(s.charges).filter(([,v])=>now>=v&&now-v<=chargeWindow(s)));
   s.charges[role]=now;result='charged';
   if(ROLES.every(r=>s.charges[r]!==undefined)){s.phase='escaped';s.status='won';s.finishedAt=now;record(s,s.playMode==='solo'?'The gate opens. One explorer completed all three stations.':'The gate opens. Every team brought us home.');result='escaped';}
 }
 if(result==='wrong-phase')return reject(result);
 s.lastEventAt=now;s.last[user]=now;s.stats.accepted++;return {state:s,result};
}
export function replay(actions){let state=fresh();for(const a of actions)state=reduce(state,a).state;return state;}
export function view(s,now=Date.now()){
 return {version:s.version,run:s.run,playMode:s.playMode??'coop',chargeWindowSeconds:chargeWindow(s)/1000,status:s.status,phase:s.phase,clues:s.clues.map(r=>({role:r,...CLUES[r]})),teams:ROLES.map(role=>({role,count:Object.values(s.players).filter(r=>r===role).length,vote:s.votes[role]||null,charged:s.charges[role]!==undefined&&now>=s.charges[role]&&now-s.charges[role]<=chargeWindow(s),chargeSeconds:s.charges[role]!==undefined&&now>=s.charges[role]?Math.max(0,Math.ceil((chargeWindow(s)-(now-s.charges[role]))/1000)):0})),events:s.events,stats:s.stats,startedAt:s.startedAt,finishedAt:s.finishedAt};
}
