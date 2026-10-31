export const roles=['scout','scribe','engineer'];
export const tools={scout:['◈','Prism telescope','!scan prism'],scribe:['⌁','Ancient mural','!decode mural'],engineer:['ϟ','Broken radio','!tune radio']};
export function presentation(s){
 if(s.playMode==='solo')return soloPresentation(s);
 const paused=s.status==='paused',ready=s.status==='ready',won=s.status==='won';
 const phase=s.phase;
 const objective=paused?'Expedition paused.':won?'YOU ESCAPED. TOGETHER.':ready?'Choose your team.':phase==='discover'?'Recover all three fragments.':phase==='align'?'Agree on the orbit sequence.':'Charge the gate together.';
 const action=paused?'Wait for the streamer to resume.':won?'Scout + Scribe + Engineer brought us home.':ready?'Streamer: start the expedition. Viewers: choose a role.':phase==='discover'?'New here? Join a role below. Then investigate your device.':phase==='align'?'Every team must vote for the correct route.':'Each team sends !charge within one 12-second window.';
 const commands=s.teams.map(t=>({role:t.role,command:ready||!t.count?'!join '+t.role:phase==='discover'?tools[t.role][2]:phase==='align'?'!vote [sequence]':phase==='charge'?'!charge':'SIGNAL CONNECTED',status:paused?'Paused':won?'HOME ✓':!t.count?'Needs a viewer':phase==='discover'?(s.clues.some(c=>c.role===t.role)?'Fragment found ✓':'Fragment needed'):phase==='align'?(t.vote||'Waiting for vote'):(t.charged?`CHARGED · ${t.chargeSeconds}s`:'Charge needed')}));
 const charged=s.teams.filter(t=>t.charged),voted=s.teams.filter(t=>t.vote);
 const count=won?3:phase==='discover'?s.clues.length:phase==='align'?voted.length:charged.length;
 const progress=won?'3 / 3 TEAMS HOME':`${count} / 3 ${phase==='discover'?'FRAGMENTS':phase==='align'?'TEAMS VOTING':'TEAMS CHARGED'}`;
 const countdown=paused?'PAUSED':won?'GATE OPEN':phase!=='charge'?'':charged.length?`${Math.min(...charged.map(t=>t.chargeSeconds))}s`:'12s';
 return {objective,action,commands,progress,countdown};
}

function soloPresentation(s){
 const ready=s.status==='ready',paused=s.status==='paused',won=s.status==='won';
 const active=s.teams.find(t=>t.count>0)?.role;
 const charged=s.teams.filter(t=>t.charged);
 const objective=paused?'Solo expedition paused.':won?'SOLO EXPEDITION COMPLETE.':ready?'One explorer. Three stations.':s.phase==='discover'?'Recover every fragment.':s.phase==='align'?'Set the orbit at every station.':'Charge all three stations.';
 const action=paused?'Resume to continue with the same explorer.':won?'One explorer completed the three stations.':ready?'Start, then join a role. The first account owns this solo expedition.':s.phase==='discover'?'Switch roles with !join, then use each device. Earned clues stay.':s.phase==='align'?'Switch roles and vote at each station. Earlier votes stay.':'Switch roles and send !charge at each station within 30 seconds.';
 const commands=s.teams.map(t=>({role:t.role,command:won?'COMPLETE':ready||active!==t.role?'!join '+t.role:s.phase==='discover'?tools[t.role][2]:s.phase==='align'?'!vote [sequence]':s.phase==='charge'?'!charge':'COMPLETE',status:paused?'Paused':won?'Complete':s.phase==='discover'?(s.clues.some(c=>c.role===t.role)?'Fragment found':'Fragment needed'):s.phase==='align'?(t.vote||'Needs vote'):(t.charged?`CHARGED - ${t.chargeSeconds}s`:'Needs charge')}));
 const count=won?3:s.phase==='discover'?s.clues.length:s.phase==='align'?s.teams.filter(t=>t.vote).length:charged.length;
 return {objective,action,commands,progress:won?'SOLO / 3 STATIONS COMPLETE':`${count} / 3 ${s.phase==='discover'?'FRAGMENTS':s.phase==='align'?'STATIONS VOTING':'STATIONS CHARGED'}`,countdown:paused?'PAUSED':won?'GATE OPEN':s.phase!=='charge'?'':charged.length?`${Math.min(...charged.map(t=>t.chargeSeconds))}s`:'30s'};
}

// Local fixture replay only. Live mode rejects fixture injection.
export const soloReplaySteps=[
 '!join scout','!scan prism','!join scribe','!decode mural','!join engineer','!tune radio',
 '!vote moon-star-sun','!join scribe','!vote moon-star-sun','!join scout','!vote moon-star-sun',
 '!charge','!join scribe','!charge','!join engineer','!charge'
].map(text=>['solo-explorer',text]);
