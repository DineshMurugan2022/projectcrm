const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const exe = path.join(__dirname,'release','win-unpacked','BNY CRM Modem.exe');
const child = spawn(exe,['--remote-debugging-port=9337','--remote-debugging-address=127.0.0.1'],{windowsHide:true,stdio:'ignore'});
let ws;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let target;
  for(let i=0;i<80;i++){
    try { const pages=await(await fetch('http://127.0.0.1:9337/json/list')).json(); target=pages.find(p=>p.type==='page'&&p.url.startsWith('https://bnycrm1.vercel.app')); if(target)break; }catch{}
    await sleep(500);
  }
  if(!target)throw new Error('App did not open the live CRM.');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const call=(method,params={})=>new Promise(resolve=>{pending.set(++id,resolve);ws.send(JSON.stringify({id,method,params}));});
  let info;
  for(let i=0;i<40;i++){
    const response=await call('Runtime.evaluate',{expression:'JSON.stringify({title:document.title,url:location.href,bridge:typeof window.bnyModem?.connect,text:document.body?.innerText?.slice(0,100)})',returnByValue:true});
    try{info=JSON.parse(response.result.result.value);}catch{}
    if(info?.bridge==='function'&&info?.text?.length>10)break;await sleep(500);
  }
  if(info?.bridge!=='function')throw new Error('Preload bridge is missing.');
  const rejected=await call('Runtime.evaluate',{expression:"window.bnyModem.connect('invalid').then(()=>false,()=>true)",awaitPromise:true,returnByValue:true});
  if(rejected.result.result.value!==true)throw new Error('Invalid ticket was not rejected.');
  const capture=await call('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(__dirname,'release','app-smoke.png'),Buffer.from(capture.result.data,'base64'));
  console.log(JSON.stringify({...info,invalidTicketRejected:true}));
  await call('Browser.close');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{ws?.close();await sleep(2000);if(child.exitCode===null)child.kill();});
