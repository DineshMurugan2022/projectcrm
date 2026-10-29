const { spawn, execSync } = require('node:child_process');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const outputDir = path.resolve(process.env.BNY_CRM_SMOKE_OUTPUT || path.join(__dirname,'release'));
const exe = path.join(outputDir,'win-unpacked','BNY CRM.exe');
// Kill any stale instance holding the Electron single-instance lock before starting.
try { execSync('taskkill /F /IM "BNY CRM.exe" 2>nul', { shell: 'cmd.exe', timeout: 5000 }); } catch {}
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bnycrm-smoke-'));
const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;
const child = spawn(exe, ['--user-data-dir=' + profileDir, '--remote-debugging-port=9337', '--remote-debugging-address=127.0.0.1'], { windowsHide: true, stdio: 'ignore', env: childEnv });
let ws, sipSocket;
let registerCount = 0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sipHeaders(message) {
  const text=message.toString('utf8');
  const boundary=text.indexOf('\r\n\r\n');
  const lines=(boundary<0?text:text.slice(0,boundary)).split('\r\n');
  const start=lines.shift()||'';
  const headers=new Map();
  for(const line of lines){const index=line.indexOf(':');if(index>0){const key=line.slice(0,index).toLowerCase();if(!headers.has(key))headers.set(key,line.slice(index+1).trim());}}
  return {start,headers};
}
function respondToRegister(packet, remote) {
  const {headers}=sipHeaders(packet);
  const to=headers.get('to')||'';
  const taggedTo=/;tag=/i.test(to)?to:`${to};tag=local-smoke`;
  const response=[
    'SIP/2.0 200 OK',
    `Via: ${headers.get('via')||''}`,
    `From: ${headers.get('from')||''}`,
    `To: ${taggedTo}`,
    `Call-ID: ${headers.get('call-id')||''}`,
    `CSeq: ${headers.get('cseq')||''}`,
    'Server: BNY-CRM-Isolated-Smoke',
    'Content-Length: 0',
    '', ''
  ].join('\r\n');
  sipSocket.send(Buffer.from(response),remote.port,remote.address);
}
(async()=>{
  sipSocket=dgram.createSocket('udp4');
  await new Promise((resolve,reject)=>{sipSocket.once('error',reject);sipSocket.bind(0,'127.0.0.1',resolve);});
  sipSocket.on('message',(packet,remote)=>{
    const {start}=sipHeaders(packet);
    if(start.startsWith('REGISTER ')){registerCount+=1;respondToRegister(packet,remote);}
  });
  let target;
  for(let i=0;i<80;i++){
    try { const pages=await(await fetch('http://127.0.0.1:9337/json/list')).json(); target=pages.find(p=>p.type==='page'&&(p.url.startsWith('https://bnycrm1.vercel.app')||p.url.startsWith('http://localhost:3000')||p.url.startsWith('http://127.0.0.1:3000'))); if(target)break; }catch{}
    await sleep(500);
  }
  if(!target)throw new Error('App did not open the live CRM.');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const call=(method,params={})=>new Promise(resolve=>{pending.set(++id,resolve);ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{
    const response=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||'Desktop page evaluation failed.');
    return response.result.result.value;
  };
  let info;
  for(let i=0;i<40;i++){
    const response=await call('Runtime.evaluate',{expression:'JSON.stringify({title:document.title,url:location.href,bridge:typeof window.bnyModem?.connect,desktopModeBridge:typeof window.bnyDesktop?.setTelecallerMode,text:document.body?.innerText?.slice(0,100)})',returnByValue:true});
    try{info=JSON.parse(response.result.result.value);}catch{}
    if(info?.bridge==='function'&&info?.text?.length>10)break;await sleep(500);
  }
  if(info?.bridge!=='function')throw new Error('Preload bridge is missing.');
  if(info?.desktopModeBridge!=='function')throw new Error('Telecaller window mode bridge is missing.');
  const rejected=await call('Runtime.evaluate',{expression:"window.bnyModem.connect('invalid').then(()=>false,()=>true)",awaitPromise:true,returnByValue:true});
  if(rejected.result.result.value!==true)throw new Error('Invalid ticket was not rejected.');
  const accountState=await call('Runtime.evaluate',{expression:'Promise.all([window.bnyPbx.getStatus(),window.bnyPbx.getConfig()]).then(([status,config])=>({status,config}))',awaitPromise:true,returnByValue:true});
  const accountInfo=accountState.result.result.value;
  assert.equal(accountInfo.status.engineRunning,false,'PBX engine should stay stopped without saved credentials.');
  assert.notEqual(accountInfo.config.hasPassword,true,'Isolated smoke profile must not have a saved SIP password.');
  const noCredentialConnect=await call('Runtime.evaluate',{expression:'window.bnyPbx.connect().then(()=>({ok:true}),error=>({ok:false,message:error.message}))',awaitPromise:true,returnByValue:true});
  assert.equal(noCredentialConnect.result.result.value.ok,false,'PBX must reject a connection without saved account credentials.');
  assert.match(noCredentialConnect.result.result.value.message,/password/i,'Missing SIP password should produce a clear setup message.');

  const mainWindow=await call('Runtime.evaluate',{expression:'JSON.stringify({width:window.outerWidth,height:window.outerHeight,innerWidth:window.innerWidth,innerHeight:window.innerHeight})',returnByValue:true});
  const mainBounds=JSON.parse(mainWindow.result.result.value);
  assert.ok(mainBounds.width<=1120&&mainBounds.height<=760,`CRM window should open at the compact screen-aware size; received ${JSON.stringify(mainBounds)}.`);

  const compactMode=JSON.parse(await evaluate('window.bnyDesktop.setTelecallerMode(true).then(JSON.stringify)'));
  assert.equal(compactMode.ok,true,'The trusted CRM page should enable telecaller compact mode.');
  const compactBounds=JSON.parse(await evaluate('JSON.stringify({width:window.outerWidth,height:window.outerHeight})'));
  assert.ok(compactBounds.width<=420&&compactBounds.width>=280,`Compact telecaller width should fit a phone window; received ${JSON.stringify(compactBounds)}.`);
  assert.ok(compactBounds.height<=700&&compactBounds.height>=420,`Compact telecaller height should fit the display; received ${JSON.stringify(compactBounds)}.`);
  const restoredMode=JSON.parse(await evaluate('window.bnyDesktop.setTelecallerMode(false).then(JSON.stringify)'));
  assert.equal(restoredMode.compact,false,'The trusted CRM page should restore its normal window mode.');
  const restoredBounds=JSON.parse(await evaluate('JSON.stringify({width:window.outerWidth,height:window.outerHeight})'));
  assert.ok(Math.abs(restoredBounds.width-mainBounds.width)<=2&&Math.abs(restoredBounds.height-mainBounds.height)<=2,
    `Leaving telecaller mode should restore the original window bounds; before=${JSON.stringify(mainBounds)}, after=${JSON.stringify(restoredBounds)}.`);
  const invalidMode=await evaluate('window.bnyDesktop.setTelecallerMode(1).then(()=>false,()=>true)');
  assert.equal(invalidMode,true,'The desktop bridge should reject non-boolean window mode requests.');

  await evaluate('window.__pbxSmokeEvents=[];window.bnyPbx.onEvent(event=>window.__pbxSmokeEvents.push(event));true');
  const localPort=sipSocket.address().port;
  const localAccount={server:`127.0.0.1:${localPort}`,domain:`127.0.0.1:${localPort}`,username:'exe-smoke',login:'exe-smoke',password:'local-only-smoke-password'};
  await evaluate(`window.bnyPbx.saveConfig(${JSON.stringify(localAccount)}).then(()=>true)`);
  await evaluate('window.bnyPbx.connect().then(()=>true)');
  const waitForRegistration=async expectedCount=>{
    const started=Date.now();
    while(Date.now()-started<15000){
      const events=JSON.parse(await evaluate('JSON.stringify(window.__pbxSmokeEvents)'));
      const successful=events.filter(event=>event.type==='registration'&&event.registered===true);
      if(successful.length>=expectedCount)return successful.length;
      await sleep(100);
    }
    throw new Error(`Packaged PBX did not register with the local mock after ${expectedCount} start(s); REGISTER packets=${registerCount}.`);
  };
  await waitForRegistration(1);
  let status=JSON.parse(await evaluate('window.bnyPbx.getStatus().then(JSON.stringify)'));
  assert.equal(status.engineRunning,true,'The app bridge should report its native PBX engine running after registration.');
  assert.equal(status.registration.registered,true,'The app bridge should report its successful local registration.');
  assert.ok(registerCount>=1,'The packaged PBX engine should send REGISTER to the isolated local mock.');

  await evaluate('window.bnyPbx.disconnect().then(()=>true)');
  const stoppedAt=Date.now();
  while(Date.now()-stoppedAt<5000){
    status=JSON.parse(await evaluate('window.bnyPbx.getStatus().then(JSON.stringify)'));
    if(!status.engineRunning)break;
    await sleep(100);
  }
  assert.equal(status.engineRunning,false,'Disconnect should stop the native PBX engine.');
  const savedConfig=JSON.parse(await evaluate('window.bnyPbx.getConfig().then(JSON.stringify)'));
  assert.equal(savedConfig.hasPassword,true,'The isolated app profile should retain the saved SIP password securely.');
  await evaluate('window.bnyPbx.connect().then(()=>true)');
  await waitForRegistration(2);
  status=JSON.parse(await evaluate('window.bnyPbx.getStatus().then(JSON.stringify)'));
  assert.equal(status.engineRunning,true,'The saved account should reconnect without entering the password again.');
  assert.equal(status.registration.registered,true,'The saved account should register successfully after reconnect.');
  await evaluate('window.bnyPbx.disconnect().then(()=>true)');

  const capture=await call('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(outputDir,'app-smoke.png'),Buffer.from(capture.result.data,'base64'));
  console.log(JSON.stringify({...info,invalidTicketRejected:true,mainBounds,compactBounds,restoredBounds,invalidModeRejected:true,noCredentialConnectRejected:true,localSipRegistrations:registerCount,savedCredentialReconnect:true}));
  void call('Browser.close');
  await sleep(250);
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  ws?.close();
  await sleep(2000);
  if(child.exitCode===null){
    child.kill();
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(2000)]);
  }
  const tempRoot=`${path.resolve(os.tmpdir()).toLowerCase()}${path.sep}`;
  const resolvedProfile=path.resolve(profileDir);
  if(resolvedProfile.toLowerCase().startsWith(tempRoot)&&path.basename(resolvedProfile).startsWith('bnycrm-smoke-')){
    try{fs.rmSync(resolvedProfile,{recursive:true,force:true});}catch{}
  }
  try{sipSocket?.close();}catch{}
  process.exit(process.exitCode||0);
});
