// Double-click launcher: detached loopback service, readiness check, then browser.
// --no-open is used for verification without launching a browser.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT)||4173;
if(Number(process.versions.node.split('.')[0])<20){console.error('请使用 Node.js 20 或更新版本。');process.exit(1);}
if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT 必须是 1–65535 的整数。');process.exit(1);}
const url=`http://127.0.0.1:${port}`,runtime=require('../runtime-paths.cjs').runtime;
function health(){return new Promise(resolve=>{const req=http.get(url+'/__muyu_health',res=>{let data='';res.setEncoding('utf8');res.on('data',chunk=>{data+=chunk;if(data.length>8192)req.destroy();});res.on('end',()=>{try{resolve(JSON.parse(data));}catch{resolve(null);}});});req.setTimeout(700,()=>req.destroy());req.on('error',()=>resolve(null));});}
const matching=data=>data?.app==='muyu-wallpaper-studio'&&path.resolve(data.workspace||'').toLowerCase()===root.toLowerCase();
async function main(){if(process.argv.includes('--stop-editor')){const h=await health();if(!matching(h))throw Error('此端口没有运行当前目录的编辑器。');const r=await fetch(url+'/__muyu_shutdown',{method:'POST',headers:{Origin:url,'X-Muyu-Action':'stop'}});if(!r.ok)throw Error('停止编辑器失败');console.log('编辑器已停止，作品仍保存在浏览器中。');return;}if(process.argv.includes('--remove-companion-startup')){await require('../companion/local-export.cjs').startup(true);console.log('已关闭系统信息服务的登录启动；当前服务继续运行。');return;}if(process.argv.includes('--stop-companion')){await require('../companion/launch.cjs').stop();console.log('本地系统信息服务已停止。');return;}fs.mkdirSync(runtime,{recursive:true});let current=await health();if(current&&!matching(current))throw Error(`端口 ${port} 正由其他服务使用，请关闭冲突服务后重试。`);
  if(!matching(current)){const out=fs.openSync(path.join(runtime,'server.log'),'a'),err=fs.openSync(path.join(runtime,'server-error.log'),'a');let child;try{child=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,env:{...process.env,PORT:String(port)},detached:true,windowsHide:true,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}child.on('error',error=>console.error('启动服务失败：'+error.message));child.unref();fs.writeFileSync(path.join(runtime,'server.pid'),String(child.pid||''));
    for(let i=0;i<50;i++){await new Promise(resolve=>setTimeout(resolve,100));current=await health();if(matching(current))break;}if(!matching(current))throw Error('本地服务未能启动，请查看 .runtime/server-error.log。');
  }
  if(process.argv.includes('--with-companion')||process.argv.includes('--we-connect'))await require('../companion/launch.cjs').launch();
  console.log('幕予 '+require('../package.json').version+' 已就绪：'+url+'\n后台服务会继续运行；下次双击会复用它。');
  if(!process.argv.includes('--no-open')){const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url+(process.argv.includes('--we-connect')?'/we-connect.html':'')],{detached:true,windowsHide:true,stdio:'ignore'});browser.on('error',e=>console.error('自动打开浏览器失败，请访问 '+url+'：'+e.message));browser.unref();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
