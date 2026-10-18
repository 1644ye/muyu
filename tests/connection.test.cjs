const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const M=require('../js/info-model.js');

const runtimeFile=path.join(__dirname,'../js/info-runtime.js');
const adapterFile=path.join(__dirname,'../js/adapter.js');
const DUMMY='dummy-local-connection-code';
const metrics=()=>({cpu:{percent:23},memory:{percent:48},network:{interfaces:[]},battery:{available:false,reason:'No system battery'}});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function settled(predicate,message='asynchronous connection update did not settle'){
  for(let i=0;i<50;i++){if(predicate())return;await tick();}
  assert.ok(predicate(),message);
}
function loadRuntime({we=false,fetch:fetchImpl}={}){
  const requests=[];
  const context={InfoModel:M,AbortController,URL,URLSearchParams,Intl,Date,setTimeout,clearTimeout,
    fetch:fetchImpl||(async(url,init)=>{requests.push({url,init});return{ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify(metrics())};})};
  if(we)context.wallpaperPropertyListener={};
  context.globalThis=context;
  vm.runInNewContext(fs.readFileSync(runtimeFile,'utf8'),context,{filename:runtimeFile});
  return{context,R:context.InfoRuntime,requests};
}
function acquire(hub,type='system',config={}){return hub.acquire(M.source(type,'test-'+type,config),()=>{});}
function assertPrivate(result,token=DUMMY){assert.ok(!JSON.stringify(result).includes(token),'connection result must not expose the connection code');}
function rendererStub(){return{scene:{nodes:[],theme:'#ffffff',themeVariables:{accent:'#ffffff'},effects:{type:'none'},speed:1,intensity:1},sceneChanges:0,setScene(scene){this.scene=scene;this.sceneChanges++;},wake(){},setPaused(){}};}
function loadAdapter(context){context.Scene={clone:value=>structuredClone(value),clamp:(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0))};vm.runInNewContext(fs.readFileSync(adapterFile,'utf8'),context,{filename:adapterFile});}

test('disconnected companion sources do not fetch and explain the actual host environment',async t=>{
  for(const we of [false,true])await t.test(we?'Wallpaper Engine guidance':'ordinary browser guidance',async()=>{
    const {R,requests}=loadRuntime({we}),hub=new R.DataHub();
    try{
      const handle=acquire(hub);
      await settled(()=>handle.entry.state.status==='unavailable');
      assert.equal(requests.length,0);
      assert.equal(handle.entry.state.data,null);
      assert.match(handle.entry.state.error,we?/系统信息未连接.*WE.*本机连接码/:/本地伴随服务|本机连接/);
      assert.equal(R.credentials.has('companion'),false);
    }finally{hub.destroy();}
  });
});

test('trimmed raw connection codes refresh waiting hubs once and clear immediately disconnects old data',async()=>{
  const {R,requests}=loadRuntime(),hub=new R.DataHub();
  try{
    const handle=acquire(hub,'system',{url:'http://127.0.0.1:29999'});
    await settled(()=>handle.entry.state.status==='unavailable');
    const connected=R.setCompanionConnection('  '+DUMMY+'  ');
    assert.equal(connected.ok,true);assert.equal(connected.changed,true);assert.equal(connected.connected,true);assertPrivate(connected);
    await settled(()=>handle.entry.state.status==='ready');
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,'http://127.0.0.1:18731/v1/metrics','private connection URL takes priority over a scene URL');
    assert.equal(requests[0].init.headers.Authorization,'Bearer '+DUMMY);
    assert.equal(handle.entry.state.data.cpu.percent,23);
    const repeated=R.setCompanionConnection(DUMMY);
    assert.equal(repeated.ok,true);assert.equal(repeated.changed,false);assertPrivate(repeated);
    await tick();assert.equal(requests.length,1,'unchanged WE property callbacks must not resample');
    const cleared=R.setCompanionConnection(' \t ');
    assert.equal(cleared.ok,true);assert.equal(cleared.changed,true);assert.equal(cleared.connected,false);assertPrivate(cleared);
    await settled(()=>handle.entry.state.status==='unavailable');
    assert.equal(handle.entry.state.data,null,'disconnection must not keep displaying old CPU values');
    assert.equal(requests.length,1);assert.equal(R.credentials.has('companion'),false);
    assert.equal(R.setCompanionConnection('').changed,false);
  }finally{hub.destroy();}
});

test('JSON string and object connection codes allow only explicit loopback endpoints and normalize trailing slash',async()=>{
  for(const endpoint of ['http://localhost:21873/','http://127.0.0.1:21873','http://[::1]:21873/']){
    const {R,requests}=loadRuntime(),hub=new R.DataHub();
    try{
      const handle=acquire(hub),value={url:endpoint,token:' '+DUMMY+' '};
      const result=R.setCompanionConnection(JSON.stringify(value));
      assert.equal(result.ok,true,endpoint);assert.equal(result.connected,true);assertPrivate(result);
      await settled(()=>handle.entry.state.status==='ready');
      assert.equal(requests[0].url,endpoint.replace(/\/$/,'')+'/v1/metrics');
      assert.equal(requests[0].init.headers.Authorization,'Bearer '+DUMMY);
      assert.equal(R.setCompanionConnection(value).changed,false,'object and JSON representations identify the same connection');
      await tick();assert.equal(requests.length,1);
    }finally{hub.destroy();}
  }
});

test('unsafe connection inputs never throw or fetch and invalidate prior credentials with safe diagnostics',async t=>{
  const unsafe=[
    ['HTTPS',{url:'https://127.0.0.1:18731',token:DUMMY}],
    ['remote host',{url:'http://example.invalid:18731',token:DUMMY}],
    ['lookalike hostname',{url:'http://localhost.evil.invalid:18731',token:DUMMY}],
    ['non-loopback IP',{url:'http://192.168.1.1:18731',token:DUMMY}],
    ['missing explicit port',{url:'http://localhost',token:DUMMY}],
    ['zero port',{url:'http://localhost:0',token:DUMMY}],
    ['oversized port',{url:'http://localhost:65536',token:DUMMY}],
    ['userinfo',{url:'http://dummy:dummy@localhost:18731',token:DUMMY}],
    ['query',{url:'http://localhost:18731/?token=dummy-query-secret',token:DUMMY}],
    ['hash',{url:'http://localhost:18731/#dummy-fragment',token:DUMMY}],
    ['path',{url:'http://localhost:18731/private',token:DUMMY}],
    ['additional field',{url:'http://localhost:18731',token:DUMMY,command:'dummy-command'}],
    ['missing code',{url:'http://localhost:18731'}],
    ['internal whitespace','dummy code'],
    ['control character','dummy\u0000code'],
    ['overlong code','d'.repeat(4097)],
    ['array',[]],['number',42],['malformed JSON','{"url":'],
  ];
  for(const[name,input]of unsafe)await t.test(name,async()=>{
    const {R,requests}=loadRuntime(),hub=new R.DataHub();
    try{
      const handle=acquire(hub);R.setCompanionConnection(DUMMY);await settled(()=>handle.entry.state.status==='ready');
      let result;assert.doesNotThrow(()=>{result=R.setCompanionConnection(input);});
      assert.equal(result.ok,false);assert.equal(result.connected,false);assert.equal(typeof result.error,'string');assertPrivate(result);
      assert.equal(R.credentials.has('companion'),false);
      await settled(()=>handle.entry.state.status==='unavailable');
      assert.equal(handle.entry.state.data,null);assert.equal(requests.length,1,'invalid code must not initiate any network request');
      assertPrivate(handle.entry.state);assert.ok(!String(handle.entry.state.error).includes('dummy-query-secret'));
      const repeated=R.setCompanionConnection(input);assert.equal(repeated.ok,false);assert.equal(repeated.changed,false,'repeated invalid callbacks must not keep restarting collection');
    }finally{hub.destroy();}
  });
});

test('a real DataHub responseJSON 401 explains code rotation without echoing the dummy code',async()=>{
  let requests=0;
  const {R}=loadRuntime({we:true,fetch:async(url,init)=>{requests++;assert.equal(url,'http://127.0.0.1:18731/v1/metrics');const correct=init.headers.Authorization==='Bearer dummy-valid-code';return{ok:correct,status:correct?200:401,headers:new Headers(),text:async()=>JSON.stringify(metrics())};}}),hub=new R.DataHub();
  try{
    R.setCompanionConnection('dummy-wrong-code');const handle=acquire(hub);
    await settled(()=>handle.entry.state.status==='unavailable');
    assert.equal(requests,1);assert.match(handle.entry.state.error,/本机连接码.*无效|服务.*换码/);
    assert.ok(!handle.entry.state.error.includes('dummy-wrong-code'));assert.equal(handle.entry.state.data,null);
    R.setCompanionConnection('dummy-valid-code');await settled(()=>handle.entry.state.status==='ready');
    assert.equal(requests,2);assert.equal(handle.entry.state.error,null);assert.equal(handle.entry.state.data.cpu.percent,23);
  }finally{hub.destroy();}
});

test('connection changes refresh all active companion consumers while leaving unrelated and injected credentials alone',async()=>{
  const {R,requests}=loadRuntime(),hubs=[];
  try{
    const handles=[];
    for(const type of ['system','battery','localfile']){const hub=new R.DataHub();hubs.push(hub);handles.push(acquire(hub,type));}
    const proxy=new R.DataHub();hubs.push(proxy);handles.push(acquire(proxy,'http',{useProxy:true,proxyId:'dummy-proxy'}));
    const direct=new R.DataHub();hubs.push(direct);const directHandle=acquire(direct,'http',{url:'https://public.example.invalid/data'});
    let injectedRequests=0;const injected=new R.DataHub({getCredential:()=>({url:'http://localhost:21999',token:'dummy-injected-code'}),fetcher:async()=>{injectedRequests++;return metrics();}});hubs.push(injected);acquire(injected);
    await settled(()=>directHandle.entry.state.status==='ready'&&injectedRequests===1);
    const before=requests.length;R.setCompanionConnection(DUMMY);
    await settled(()=>handles.every(h=>h.entry.state.status==='ready'));
    assert.equal(requests.length-before,4);assert.equal(direct.stats.requests,1);assert.equal(injectedRequests,1);
    R.setCompanionConnection('dummy-replacement-code');
    await settled(()=>requests.length===before+8);assert.equal(direct.stats.requests,1);assert.equal(injectedRequests,1);
    const destroyed=hubs.shift();destroyed.destroy();const after=requests.length;
    R.setCompanionConnection('dummy-third-code');await settled(()=>requests.length===after+3);
    assert.equal(destroyed.entries.size,0,'destroyed hubs must unregister from connection updates');
  }finally{hubs.forEach(h=>h.destroy());}
});

test('paused hubs stay paused across connection changes and resume with the current code',async()=>{
  const {R,requests}=loadRuntime(),hub=new R.DataHub();
  try{
    hub.pause(true);const handle=acquire(hub);R.setCompanionConnection(DUMMY);await tick();
    assert.equal(requests.length,0);assert.equal(hub.paused,true);
    hub.pause(false);await settled(()=>handle.entry.state.status==='ready');assert.equal(requests.length,1);
  }finally{hub.destroy();}
});

test('disconnecting a paused hub immediately notifies subscribers that old metrics are unavailable',async()=>{
  const {R}=loadRuntime(),hub=new R.DataHub(),updates=[];
  try{
    R.setCompanionConnection(DUMMY);
    const handle=hub.acquire(M.source('system','paused'),state=>updates.push(state));
    await settled(()=>handle.entry.state.status==='ready');hub.pause(true);
    R.setCompanionConnection('');
    assert.equal(hub.paused,true);
    assert.equal(updates.at(-1).status,'unavailable');
    assert.equal(updates.at(-1).data,null,'disconnection must reach Runtime subscribers even while collection is paused');
  }finally{hub.destroy();}
});

test('late results from a replaced or cleared connection cannot overwrite current metrics',async()=>{
  const {R}=loadRuntime(),pending=[],hub=new R.DataHub({fetcher:(url,init)=>new Promise(resolve=>pending.push({url,init,resolve}))});
  try{
    R.setCompanionConnection('dummy-first-code');const handle=acquire(hub);
    assert.equal(pending.length,1);
    R.setCompanionConnection('dummy-second-code');assert.equal(pending.length,2);assert.equal(pending[0].init.signal.aborted,true);
    pending[1].resolve({cpu:{percent:55}});await settled(()=>handle.entry.state.status==='ready');
    pending[0].resolve({cpu:{percent:9}});await tick();
    assert.equal(handle.entry.state.data.cpu.percent,55,'a transport that ignores AbortSignal still cannot publish a stale request');
    R.setCompanionConnection('dummy-third-code');assert.equal(pending.length,3);
    R.setCompanionConnection('');assert.equal(pending[2].init.signal.aborted,true);
    pending[2].resolve({cpu:{percent:33}});await tick();
    assert.equal(handle.entry.state.status,'unavailable');assert.equal(handle.entry.state.data,null);
  }finally{hub.destroy();}
});

test('WE companion property uses the runtime connection setter without rebuilding the scene or resampling same code',async()=>{
  const {context,R,requests}=loadRuntime({we:true}),hub=new R.DataHub(),renderer=rendererStub();renderer.info={hub};loadAdapter(context);
  try{
    const handle=acquire(hub),adapter=new context.WallpaperAdapter(renderer);
    adapter.apply({companiontoken:{value:' '+DUMMY+' '}});await settled(()=>handle.entry.state.status==='ready');
    assert.equal(requests.length,1);assert.equal(renderer.sceneChanges,0);
    context.wallpaperPropertyListener.applyUserProperties({companiontoken:{value:DUMMY}});await tick();
    assert.equal(requests.length,1);assert.equal(renderer.sceneChanges,0);
    adapter.apply({animationspeed:{value:2}});assert.equal(renderer.scene.speed,2);assert.equal(renderer.sceneChanges,1);
    adapter.apply({companiontoken:{value:''}});await settled(()=>handle.entry.state.status==='unavailable');
    assert.equal(renderer.sceneChanges,1);assert.equal(handle.entry.state.data,null);
  }finally{hub.destroy();}
});

test('legacy adapter environments without InfoRuntime remain safe for connection properties and normal properties',()=>{
  const context={};context.globalThis=context;loadAdapter(context);const renderer=rendererStub(),adapter=new context.WallpaperAdapter(renderer);
  assert.doesNotThrow(()=>adapter.apply({companiontoken:{value:DUMMY}}));
  assert.doesNotThrow(()=>adapter.apply({animationspeed:{value:1.5}}));
  assert.equal(renderer.scene.speed,1.5);
});
