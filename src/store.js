import {readFileSync,writeFileSync,renameSync,existsSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname} from 'node:path';
import {fresh,replay,reduce} from './game.js';
export class Store {
 constructor(path){this.path=path;this.actions=[];this.state=fresh();this.identityKey=randomBytes(32).toString('hex');if(path&&existsSync(path)){const saved=JSON.parse(readFileSync(path,'utf8'));if(saved.version!==1||!Array.isArray(saved.actions)||saved.actions.length>50000)throw new Error('Invalid recovery journal');if(typeof saved.identityKey!=='string'||!/^[a-f0-9]{64}$/.test(saved.identityKey))throw new Error('Invalid recovery identity');this.identityKey=saved.identityKey;this.actions=saved.actions;this.state=replay(this.actions);}}
 apply(action){if(this.actions.length>=50000)throw new Error('Journal full. Export and start a new local session.');const next=reduce(this.state,action);const actions=[...this.actions,action];if(this.path){mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify({version:1,identityKey:this.identityKey,actions}),{mode:0o600});renameSync(this.path+'.tmp',this.path);}this.actions=actions;this.state=next.state;return next.result;}
}
