export const roles=['scout','scribe','engineer'];
export const tools={scout:['◈','Prism telescope','!scan prism'],scribe:['⌁','Ancient mural','!decode mural'],engineer:['ϟ','Broken radio','!tune radio']};
export function presentation(s){
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
