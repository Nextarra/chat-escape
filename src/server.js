import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
import {Store} from './store.js';
import {view} from './game.js';
import {AuthorizedSession} from './authorization.js';
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
export function createApp({journal=null,mode='fixture',clock=Date.now}={}){
 const store=new Store(journal);const secret=randomBytes(32).toString('hex');let connection=mode==='fixture'?'simulation':'offline';let adapter,storageBlocked=false;
 if(mode==='live'&&store.state.status==='playing')store.apply({type:'pause',now:clock()});
 const ingest=({id,user,text,now=clock(),receivedAt=clock(),run=store.state.run})=>{
  if(mode==='live'&&(storageBlocked||connection!=='connected'))return 'inactive';
  if(typeof id!=='string'||id.length>160||typeof user!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(user)||typeof text!=='string'||text.length>160)return 'invalid';
  const command=text.trim().toLowerCase().replace(/\s+/g,' ');
  if(!/^!(join (scout|scribe|engineer)|scan prism|decode mural|tune radio|vote (moon-star-sun|sun-star-moon|star-moon-sun)|charge)$/.test(command))return 'ignored';
  return store.apply({type:'chat',id,user:createHmac('sha256',store.identityKey).update(user).digest('hex'),text:command,now,receivedAt,run});
 };
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host||'')){res.writeHead(403);return res.end('Local access only');}
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  const path=req.url?.split('?')[0];const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  try{
   if(req.method==='GET'&&path==='/api/state')return send(200,{...view(store.state,clock()),...(storageBlocked?{status:'paused'}:{}),mode,connection});
   if(req.method==='POST'&&['/api/control','/api/chat'].includes(path)){
    if(req.headers.origin!==`http://${host}`||!req.headers.cookie?.split('; ').includes(`control=${secret}`))return send(403,{error:'Controller access required'});
    if(req.headers['content-type']!=='application/json')return send(415,{error:'JSON required'});
    if(Number(req.headers['content-length'])>2048){req.resume();return send(413,{error:'Request too large'});}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048){send(413,{error:'Request too large'});req.destroy();return;}}
    let a;try{a=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
    if(!a||typeof a!=='object')return send(400,{error:'Invalid action'});
    if(path==='/api/control'){
      if(!['start','pause','reset'].includes(a.type))return send(400,{error:'Unknown control'});
      if(a.playMode!==undefined&&(a.type!=='reset'||!['coop','solo'].includes(a.playMode)))return send(400,{error:'Choose cooperative or solo only when starting a new expedition'});
      if(mode==='live'&&a.type==='start'&&(storageBlocked||connection!=='connected'))return send(409,{error:'Twitch must be connected before resuming'});
      const result=store.apply({type:a.type,...(a.playMode!==undefined?{playMode:a.playMode}:{}),now:clock()});return send(200,{result});
    }
    if(mode!=='fixture')return send(403,{error:'Fixture injection disabled in live mode'});
    const result=ingest({id:a.id,user:a.user,text:a.text,run:a.run});return send(200,{result});
   }
   if(req.method==='GET'){
    const files={'/':['index.html','text/html'],'/overlay':['overlay.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/overlay.css':['overlay.css','text/css'],'/overlay.js':['overlay.js','text/javascript'],'/presentation.js':['presentation.js','text/javascript']};
    if(files[path]){if(path==='/')res.setHeader('Set-Cookie',`control=${secret}; HttpOnly; SameSite=Strict; Path=/`);const [file,mime]=files[path];res.writeHead(200,{'Content-Type':mime});return res.end(readFileSync(resolve(publicDir,file)));}
   }
   send(404,{error:'Not found'});
  }catch(error){send(500,{error:'Operation failed; current state preserved. Check journal storage.'});}
 });
 const status=(value)=>{connection=value;if(mode==='live'&&value!=='connected'&&store.state.status==='playing'){try{store.apply({type:'pause',now:clock()});}catch{storageBlocked=true;connection='storage-error';}}};
 return {server,store,ingest,status,startLive(config){if(mode!=='live')throw new Error('Not live mode');if(adapter)adapter.stop();adapter=new AuthorizedSession({...config,onChat:ingest,onStatus:status});return adapter.start();},stop(){adapter?.stop();server.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const live=process.argv.includes('--live');const app=createApp({journal:resolve('data/journal.json'),mode:live?'live':'fixture'});
 if(live)app.startLive({clientId:process.env.TWITCH_CLIENT_ID,token:process.env.TWITCH_USER_TOKEN,broadcasterId:process.env.TWITCH_BROADCASTER_ID,userId:process.env.TWITCH_USER_ID,expectedLogin:process.env.TWITCH_LOGIN||'nextarra'});
 const port=Number(process.env.PORT||4317);app.server.listen(port,'127.0.0.1',()=>console.log(`Chat Escape ${live?'LIVE ADAPTER (resume manually)':'FIXTURE SIMULATION'}: http://127.0.0.1:${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.stop();});
}
