import {TwitchAdapter} from './twitch.js';

// Uses an already-authorized token. Never creates, refreshes, stores or prints credentials.
export class AuthorizedSession {
 constructor(config) {
  if(typeof config.clientId!=='string'||!config.clientId||typeof config.token!=='string'||!config.token||
     !/^\d+$/.test(config.userId||'')||!/^\d+$/.test(config.broadcasterId||'')) {
   throw new Error('Live mode requires explicit Twitch credentials and numeric IDs');
  }
  this.config=config; this.fetch=config.fetchImpl||fetch;
  this.timers=config.timers||globalThis; this.stopped=true; this.generation=0;
 }
 async start() {
  if(!this.stopped)return;
  this.stopped=false; const generation=++this.generation;
  this.abort=new AbortController(); this.config.onStatus('validating');
  await this.validate(generation,true);
 }
 stop(status='stopped') {
  this.stopped=true; this.generation++; this.abort?.abort();
  this.timers.clearTimeout(this.validationTimer); this.timers.clearTimeout(this.expiryTimer);
  if(this.adapter){this.adapter.stop(status);this.adapter=null;}else this.config.onStatus(status);
 }
 async validate(generation,initial=false) {
  const current=()=>!this.stopped&&generation===this.generation;
  try {
   const c=this.config;
   const response=await this.fetch('https://id.twitch.tv/oauth2/validate',{
    headers:{Authorization:`OAuth ${c.token}`},
    signal:AbortSignal.any([this.abort.signal,AbortSignal.timeout(10000)])
   });
   if(!current())return;
   if(response.status!==200)throw new Error('Invalid authorization');
   const data=await response.json();
   if(!current())return;
   if(data.client_id!==c.clientId||data.user_id!==c.userId||c.userId!==c.broadcasterId||
      typeof data.login!=='string'||(c.expectedLogin&&data.login!==c.expectedLogin.toLowerCase())||
      !Array.isArray(data.scopes)||!data.scopes.includes('user:read:chat')||
      !Number.isFinite(data.expires_in)||data.expires_in<=0)throw new Error('Invalid authorization');
   this.timers.clearTimeout(this.expiryTimer);
   this.expiryTimer=this.timers.setTimeout(()=>{if(current())this.stop('authorization-expired');},Math.min(data.expires_in*1000,2147483647));
   if(initial){
    const Adapter=c.AdapterImpl||TwitchAdapter;
    this.adapter=new Adapter({...c,onStatus:value=>{
     if(['revoked','authorization-failed','capacity'].includes(value)) {
      this.timers.clearTimeout(this.validationTimer); this.timers.clearTimeout(this.expiryTimer);
      this.stopped=true;this.generation++;this.abort?.abort();
     }
     c.onStatus(value);
    }});
    this.adapter.start();
   }
   if(current())this.validationTimer=this.timers.setTimeout(()=>this.validate(generation),Math.min(3500000,data.expires_in*500));
  }catch {
   // Fail closed on invalid, revoked, malformed, timed-out or unavailable validation.
   if(current())this.stop('authorization-failed');
  }
 }
}
