// Personal machine exports: scoped metrics credential, never the administration key.
const fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),{configuration,metricsToken}=require('./service.cjs'),{launch}=require('./launch.cjs');
const key='HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',name='MuyuSystemInfo';
async function startup(remove=false){
  if(process.platform!=='win32')throw Error('本机自动连接导出需要 Windows。');
  if(remove){try{await run('reg.exe',['delete',key,'/v',name,'/f'],{windowsHide:true});}catch(e){if(e.code!==1)throw e;}return;}
  const file=path.resolve(__dirname,'../.runtime/companion-login.vbs');
  const command='"'+process.execPath+'" "'+path.join(__dirname,'launch.cjs')+'"';
  fs.writeFileSync(file,'CreateObject("WScript.Shell").Run "'+command.replace(/"/g,'""')+'", 0, False\r\n');
  await run('reg.exe',['add',key,'/v',name,'/t','REG_SZ','/d','wscript.exe "'+file+'"','/f'],{windowsHide:true});
}
async function prepare(){
  const connection=await launch(),c=configuration(),token=metricsToken(c);
  const response=await fetch(connection.url+'/v1/metrics',{headers:{Authorization:'Bearer '+token,Origin:'null'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('本机服务仍是旧版本，请重新启动编辑器信息服务后再导出。');
  const data=await response.json();if(!Number.isFinite(data.memory?.percent))throw Error('本机内存采样未就绪，请稍后重试。');
  await startup();return{url:connection.url,token};
}
module.exports={prepare,startup};
if(require.main===module)startup(process.argv.includes('--remove')).then(()=>console.log('登录启动设置已更新。')).catch(e=>{console.error(e.message);process.exitCode=1;});
