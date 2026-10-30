// Opt-in adapter. No token creation, OAuth or outbound chat. Twitch EventSub v1.
const ENDPOINT = 'wss://eventsub.wss.twitch.tv/ws';
export class TwitchAdapter {
 constructor({clientId,token,broadcasterId,userId,onChat,onStatus,fetchImpl=fetch,WebSocketImpl=WebSocket,timers=globalThis,clock=Date.now}) {
  if(!clientId||!token||!/^\d+$/.test(broadcasterId)||!/^\d+$/.test(userId))throw new Error('Live mode requires explicit Twitch credentials and numeric IDs');
  Object.assign(this,{clientId,token,broadcasterId,userId,onChat,onStatus,fetchImpl,WebSocketImpl,timers,clock});
  this.sockets=new Set();this.contexts=new Set();this.stopped=true;this.retry=0;this.seen=new Set();this.generation=0;
 }
 start(){if(!this.stopped)return;this.stopped=false;this.connect(ENDPOINT,false);}
 stop(finalStatus='stopped'){
  this.stopped=true;this.generation++;this.candidate=null;this.active=null;
  this.timers.clearTimeout(this.retryTimer);this.timers.clearTimeout(this.watchdog);
  for(const ctx of [...this.contexts])this.retire(ctx);
  this.onStatus(finalStatus);
 }
 open(ctx){return !this.stopped&&!ctx.closed&&this.sockets.has(ctx.socket)&&(ctx.socket.readyState===undefined||ctx.socket.readyState===1);}
 current(ctx){return this.open(ctx)&&(this.active===ctx.socket||this.candidate===ctx);}
 retire(ctx){if(ctx.closed)return;ctx.closed=true;ctx.abort.abort();this.timers.clearTimeout(ctx.welcomeTimer);this.sockets.delete(ctx.socket);this.contexts.delete(ctx);ctx.socket.close();}
 retryConnection(){
  this.timers.clearTimeout(this.retryTimer);const generation=this.generation;
  this.retryTimer=this.timers.setTimeout(()=>{if(!this.stopped&&this.generation===generation)this.connect(ENDPOINT,false);},Math.min(30000,1000*2**this.retry++));
 }
 connect(url,migration){
  if(this.stopped)return;
  const u=new URL(url);if(u.protocol!=='wss:'||u.hostname!=='eventsub.wss.twitch.tv'||u.port||u.username||u.password)throw new Error('Unsafe Twitch reconnect URL');
  const oldCandidate=this.candidate;
  const socket=new this.WebSocketImpl(url);
  const ctx={socket,generation:++this.generation,closed:false,welcomed:false,abort:new AbortController()};
  this.candidate=ctx;this.sockets.add(socket);this.contexts.add(ctx);
  if(oldCandidate&&oldCandidate.socket!==this.active)this.retire(oldCandidate);
  this.timers.clearTimeout(this.retryTimer);this.onStatus(migration?'reconnecting':'connecting');
  const disconnected=()=>{
   if(ctx.closed)return;
   const wasActive=this.active===socket,wasCandidate=this.candidate===ctx;
   this.retire(ctx);
   if(!wasActive&&!wasCandidate||this.stopped)return;
   if(wasActive){this.active=null;this.timers.clearTimeout(this.watchdog);}
   if(wasCandidate)this.candidate=null;
   this.onStatus('disconnected');
   // A migration candidate can still finish after its old connection closes.
   if(this.candidate)return;
   // A failed migration needs a fresh session, rather than a stranded old socket.
   if(this.active){const old=[...this.contexts].find(c=>c.socket===this.active);this.active=null;if(old)this.retire(old);this.timers.clearTimeout(this.watchdog);}
   this.retryConnection();
  };
  ctx.disconnect=disconnected;ctx.welcomeTimer=this.timers.setTimeout(disconnected,15000);
  socket.onmessage=async({data})=>{
   if(!this.current(ctx))return;
   try{
    const message=JSON.parse(String(data));const type=message.metadata?.message_type;
    if(type==='session_welcome'){
     if(ctx.welcomed||this.candidate!==ctx||ctx.generation!==this.generation)return;
     ctx.welcomed=true;
     const session=message.payload?.session;
     if(!session?.id||!Number.isFinite(session.keepalive_timeout_seconds)||session.keepalive_timeout_seconds<10||session.keepalive_timeout_seconds>600)throw new Error('Invalid welcome');
     if(!migration)await this.subscribe(session.id,ctx.abort.signal);
     // A close/retry/stop may occur while the HTTP subscription is outstanding.
     if(!this.open(ctx)||this.candidate!==ctx||ctx.generation!==this.generation)return;
     this.timers.clearTimeout(ctx.welcomeTimer);
     const previous=[...this.contexts].find(c=>c.socket===this.active);
     this.active=socket;this.candidate=null;this.retry=0;this.keepalive=session.keepalive_timeout_seconds*1000;
     this.heartbeat(ctx);if(previous&&previous!==ctx)this.retire(previous);this.onStatus('connected');
    }else if(socket!==this.active){return;}
    else if(type==='session_keepalive'){this.heartbeat(ctx);}
    else if(type==='session_reconnect'){
     if(!this.candidate)this.connect(message.payload.session.reconnect_url,true);
    }else if(type==='revocation'){this.stop('revoked');}
    else if(type==='notification'){
     this.heartbeat(ctx);
     const p=message.payload,e=p?.event;
     if(p?.subscription?.type!=='channel.chat.message'||p.subscription.version!=='1'||e?.broadcaster_user_id!==this.broadcasterId||typeof e?.message?.text!=='string'||typeof e?.message_id!=='string'||typeof e?.chatter_user_id!=='string')return;
     const timestamp=Date.parse(message.metadata.message_timestamp),receivedAt=this.clock();
     // Strictly reject future timestamps; delayed packets have a two-minute bound.
     if(!Number.isFinite(timestamp)||timestamp<0||!Number.isFinite(receivedAt)||receivedAt<0||timestamp>receivedAt||receivedAt-timestamp>120000)return;
     const command=e.message.text.trim().toLowerCase().replace(/\s+/g,' ');
     if(e.message.text.length>160||e.message_id.length>160||!/^[0-9]{1,100}$/.test(e.chatter_user_id)||!/^!(join (scout|scribe|engineer)|scan prism|decode mural|tune radio|vote (moon-star-sun|sun-star-moon|star-moon-sun)|charge)$/.test(command))return;
     if(this.seen.has(e.message_id))return;
     if(this.seen.size>=20000){this.stop('capacity');return;}
     this.seen.add(e.message_id);
     this.onChat({id:e.message_id,user:e.chatter_user_id,text:e.message.text,now:timestamp,receivedAt});
    }
   }catch(error){
    // Stale success AND stale failure must leave a healthy replacement untouched.
    if(!this.current(ctx))return;
    if(error.message==='authorization-failed'){this.stop('authorization-failed');return;}
    this.onStatus('adapter-error');disconnected();
   }
  };
  socket.onclose=disconnected;socket.onerror=disconnected;
 }
 heartbeat(ctx){
  this.timers.clearTimeout(this.watchdog);
  this.watchdog=this.timers.setTimeout(()=>{if(this.open(ctx)&&this.active===ctx.socket){this.onStatus('keepalive-timeout');ctx.disconnect();}},this.keepalive+2000);
 }
 async subscribe(sessionId,signal){
  const response=await this.fetchImpl('https://api.twitch.tv/helix/eventsub/subscriptions',{method:'POST',headers:{'Client-Id':this.clientId,Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:this.broadcasterId,user_id:this.userId},transport:{method:'websocket',session_id:sessionId}}),signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
  if([401,403].includes(response.status))throw new Error('authorization-failed');
  if(response.status!==202)throw new Error('Twitch subscription failed');
 }
}
