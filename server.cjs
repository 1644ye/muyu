// A loopback-only static development server; exported wallpapers do not need this.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.woff2':'font/woff2','.zip':'application/zip','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => {
  const localPort=server.address()?.port,allowedHosts=new Set([`127.0.0.1:${localPort}`,`localhost:${localPort}`]);
  if(!allowedHosts.has(req.headers.host)){res.writeHead(403).end('Host rejected');return;}
  if(req.method==='POST'&&req.url==='/__muyu_shutdown'){if(!new Set([`http://127.0.0.1:${localPort}`,`http://localhost:${localPort}`]).has(req.headers.origin)||req.headers['x-muyu-action']!=='stop'){res.writeHead(403).end();return;}res.writeHead(200).end('Stopped');server.close();server.closeIdleConnections();return;}
  if(req.method==='POST'&&req.url==='/__muyu_companion/export-local'){
    if(!new Set([`http://127.0.0.1:${localPort}`,`http://localhost:${localPort}`]).has(req.headers.origin)||req.headers['x-muyu-action']!=='connect'){res.writeHead(403).end('Origin rejected');return;}
    require('./companion/local-export.cjs').prepare().then(info=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(info));}).catch(e=>{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));});return;
  }
  if(req.method==='POST'&&req.url==='/__muyu_companion/connect'){
    const allowedOrigins=new Set([`http://127.0.0.1:${localPort}`,`http://localhost:${localPort}`]);
    if(!allowedOrigins.has(req.headers.origin)||req.headers['x-muyu-action']!=='connect'){res.writeHead(403).end('Origin rejected');return;}
    require('./companion/launch.cjs').launch().then(info=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(info));}).catch(e=>{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));});return;
  }
  if(req.method==='GET'&&req.url==='/__muyu_health'){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify({app:'muyu-wallpaper-studio',version:require('./package.json').version,workspace:root}));return;
  }
  // Optional local QA output, disabled in normal editor startup. Fixed destinations
  // only, with same-origin protection. Never accepts arbitrary file paths.
  if(req.method==='POST'&&process.argv.includes('--qa-write')) {
    const outputs={'/__qa_artifacts/examples.zip':'examples/muyu-examples.zip','/__qa_artifacts/report.json':'docs/browser-results.json'};
    const output=outputs[req.url],origin=`http://127.0.0.1:${server.address().port}`;
    if(!output||req.headers.origin!==origin){res.writeHead(403).end();return;}
    const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>40e6){req.destroy();return;}chunks.push(chunk);});req.on('end',()=>{const target=path.join(root,output);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFile(target,Buffer.concat(chunks),err=>res.writeHead(err?500:200,{'Content-Type':'text/plain'}).end(err?'write failed':'saved'));});return;
  }
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  if(path.relative(root,file).split(path.sep).some(part=>part.startsWith('.'))){res.writeHead(403).end('Private path');return;}
  if (file === root) file = path.join(root,'index.html');
  fs.stat(file, (err,st) => {
    if (err || !st.isFile()) {res.writeHead(404).end('Not found');return;}
    const headers = {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range) { const start=Number(range[1]), end=Math.min(Number(range[2]||st.size-1),st.size-1); if(start>end){res.writeHead(416).end();return;} res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res); }
    else {res.writeHead(200,{...headers,'Content-Length':st.size});fs.createReadStream(file).pipe(res);}
  });
});
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?'端口已被占用，请使用一键打开复用现有服务，或通过 PORT 指定其他端口。':err.message);process.exitCode=1;});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`幕予已启动: http://127.0.0.1:${server.address().port}  (Ctrl+C 停止)`));
