const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {start,metricsToken}=require('../companion/service.cjs'),P=require('../js/package.js'),Z=require('../js/zip.js'),S=require('../js/scene.js'),M=require('../js/info-model.js');
test('embedded metrics grant can read real memory but cannot stop service or read files/proxies',async()=>{
 const service=start({port:18741});await new Promise(r=>service.server.listening?r():service.server.once('listening',r));
 try{const headers={Authorization:'Bearer '+metricsToken(service.config),Origin:'null'},url='http://127.0.0.1:18741';
 assert.notEqual(metricsToken(service.config),service.config.token);
 const result=await fetch(url+'/v1/metrics',{headers});assert.equal(result.status,200);assert.ok(Number.isFinite((await result.json()).memory.percent));
 for(const [route,method]of [['/v1/shutdown','POST'],['/v1/files/example.json','GET'],['/v1/proxy/private','GET']])assert.equal((await fetch(url+route,{method,headers})).status,403);
 }finally{await new Promise(r=>service.server.close(r));}
});
test('local wallpaper initializes credentials without WE properties and never includes them in editable scene',async()=>{
 const scene=S.blank();scene.sources=[M.source('system','system')];scene.nodes=[S.node('plugin',{plugin:M.makePlugin('memory','system')})];
 const sources=Object.fromEntries(P.runtimeFiles.map(n=>[n,fs.readFileSync('js/'+n,'utf8')])),connection={url:'http://127.0.0.1:18731',token:'metrics-'+'a'.repeat(64)};
 const files=await Z.unpack(await P.wallpaper(scene,new Map(),sources,new Blob(['preview']),connection)),read=n=>new TextDecoder().decode(files[n]);
 assert.ok(read('index.html').indexOf('local-connection.js')<read('index.html').indexOf('scene-data.js'));
 assert.equal(JSON.parse(read('project.json')).general.properties.companiontoken,undefined);
 assert.ok(!read('scene.json').includes(connection.token));assert.ok(!read('scene-data.js').includes(connection.token));
 let received;const context={InfoRuntime:{setCompanionConnection:v=>received=v}};context.window=context;vm.runInNewContext(read('local-connection.js'),context);assert.equal(received.token,connection.token);
 const renderer={scene,setScene(){}};context.Scene=S;context.globalThis=context;vm.runInNewContext(sources['adapter.js'],context);new context.WallpaperAdapter(renderer);context.wallpaperPropertyListener.applyUserProperties({companiontoken:{value:''}});assert.equal(received.token,connection.token);
 await assert.rejects(P.wallpaper(scene,new Map(),sources,new Blob(['p']),{...connection,token:'admin-secret'}),/只读连接/);
});
