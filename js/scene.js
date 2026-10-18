/* Versioned, DOM-independent scene model. Shared by editor, exporter and tests. */
(function(root,factory){const api=factory(typeof module==='object'?require('./info-model.js'):root.InfoModel,typeof module==='object'?require('./info-css.js'):root.InfoCSS);if(typeof module==='object')module.exports=api;else root.Scene=api;})(globalThis,(M,C)=>{
  'use strict';
  const VERSION=2, TYPES=['text','image','video','shape','clock','date','countdown','audio','plugin'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const id=()=>globalThis.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
  const targetDate=()=>{const d=new Date(Date.now()+30*86400000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
  function node(type,extra={}) {
    return {id:id(),type,name:({text:'文字',image:'图片',video:'视频',shape:'形状',clock:'时钟',date:'日期',countdown:'倒计时',audio:'音频频谱',plugin:'信息插件'})[type],x:560,y:400,w:800,h:160,rotation:0,opacity:1,visible:true,locked:false,group:null,anchor:'center',keepRatio:true,
      text:'让桌面，慢下来。',font:'"Segoe UI", "Microsoft YaHei", sans-serif',fontAsset:null,fontSize:64,fontWeight:400,color:'#f2f5f2',letterSpacing:0,lineHeight:1.3,align:'center',stroke:0,strokeColor:'#000000',shadow:0,
      asset:null,fit:'cover',radius:0,border:0,borderColor:'#ffffff',fill:'#b7e4ce',fillOpacity:1,shape:'rect',clockStyle:'digital',hour12:false,seconds:false,dateFormat:'long',target:targetDate(),countFormat:'days',effect:'none',speed:1,strength:12,parallax:0,bars:48,...extra};
  }
  function blank(name='未命名作品') {return M.defaults({format:'muyu-scene',version:VERSION,id:id(),name,width:1920,height:1080,fit:'contain',quality:'medium',theme:'#b7e4ce',speed:1,intensity:1,background:{type:'gradient',color:'#111c23',color2:'#284738',angle:135,asset:null,fit:'cover',flow:false},effects:{type:'none',count:64,speed:1,strength:0.5},nodes:[],assets:[]});}
  function validate(input) {
    if(!input||input.format!=='muyu-scene')throw Error('不是幕予工程：缺少场景格式标识。');
    if(![1,VERSION].includes(input.version))throw Error(`不兼容的工程版本 ${input.version}，当前支持版本 ${VERSION}。`);
    const s=M.defaults(clone(input)), num=(v,a,b,label)=>{if(!Number.isFinite(v)||v<a||v>b)throw Error('工程参数无效：'+label);};s.version=VERSION;
    if(typeof s.id!=='string'||!s.id||typeof s.name!=='string'||s.name.length>200)throw Error('工程名称或标识无效');
    const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
    if(!hex(s.theme))throw Error('工程主题色无效');
    num(s.width,240,7680,'宽度');num(s.height,240,7680,'高度');
    if(!['contain','cover','responsive'].includes(s.fit)||!['low','medium','high'].includes(s.quality))throw Error('画布设置无效');
    if(!Array.isArray(s.nodes)||s.nodes.length>500||!Array.isArray(s.assets)||s.assets.length>500)throw Error('工程图层或素材数量异常');
    if(!s.background||!['solid','gradient','image','video'].includes(s.background.type)||!hex(s.background.color)||!hex(s.background.color2)||!['contain','cover'].includes(s.background.fit)||!s.effects||!['none','particles','stars','rain','snow'].includes(s.effects.type))throw Error('背景或效果无效');
    num(s.speed,0,5,'动画速度');num(s.intensity,0,2,'效果强度');num(s.effects.count,0,300,'粒子数');num(s.effects.speed,0,5,'粒子速度');num(s.effects.strength,0,2,'粒子强度');num(s.background.angle,0,360,'渐变角度');
    const ids=new Set(), aids=new Set();
    for(const a of s.assets){if(!a||typeof a.id!=='string'||!/^[\w-]+$/.test(a.id)||aids.has(a.id)||!['image','video','font'].includes(a.kind)||typeof a.name!=='string'||!['png','jpg','jpeg','webp','gif','webm','ogg','ogv','woff','woff2','ttf','otf'].includes(a.ext))throw Error('素材清单无效');aids.add(a.id);}
    for(const n of s.nodes){if(!TYPES.includes(n.type)||typeof n.id!=='string'||ids.has(n.id))throw Error('图层类型或标识无效');if(!['color','fill','strokeColor','borderColor'].every(k=>hex(n[k])))throw Error('图层颜色无效');ids.add(n.id);for(const k of ['x','y'])num(n[k],-50000,50000,k);for(const k of ['w','h'])num(n[k],1,50000,k);num(n.rotation,-36000,36000,'角度');num(n.opacity,0,1,'透明度');num(n.fillOpacity,0,1,'填充透明度');
      for(const [key,min,max] of [['fontSize',1,2000],['fontWeight',100,900],['letterSpacing',-20,200],['lineHeight',0.5,5],['stroke',0,20],['shadow',0,100],['radius',0,2000],['border',0,100],['speed',0,5],['strength',0,200],['parallax',0,100],['bars',8,128]])num(n[key],min,max,key);
      if(!['none','breathe','fade','float'].includes(n.effect)||!['top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right'].includes(n.anchor)||!['cover','contain'].includes(n.fit)||!['left','center','right'].includes(n.align)||typeof n.name!=='string'||typeof n.font!=='string'||typeof n.text!=='string'||n.text.length>20000)throw Error('图层样式无效');
      if(n.type==='countdown'&&!Number.isFinite(Date.parse(n.target)))throw Error('倒计时目标时间无效');
    }
    const schemaErrors=M.validateSchema(s,M.sceneSchema(blank(),node('text')));if(schemaErrors.length){const e=Error(schemaErrors.slice(0,8).map(x=>x.path+'：'+x.message).join('\n'));e.details=schemaErrors;throw e;}const valid=M.validateScene(s);for(const [path,code] of [['$/themeVariables',':host{'+Object.entries(s.themeVariables).map(([k,v])=>'--'+k+':'+v).join(';')+'}'],['$/customCSS',s.customCSS.enabled?s.customCSS.code:''],...s.nodes.filter(n=>n.type==='plugin').flatMap(n=>[['$/nodes/'+n.id+'/plugin/css',n.plugin.css.enabled?n.plugin.css.code:''],['$/nodes/'+n.id+'/plugin/appearance',':host{--bg:'+n.plugin.appearance.background+(n.plugin.appearance.gradient?';--gradient:'+n.plugin.appearance.gradient:'')+'}'],...n.plugin.rules.filter(r=>r.set.background).map(r=>['$/nodes/'+n.id+'/plugin/rules',':host{--bg:'+r.set.background+'}'])])]){const errs=C.validate(code);if(errs.length){const e=Error(path+'：'+errs[0].message);e.details=errs.map(x=>({...x,path}));throw e;}}return valid;
  }
  function usedAssets(s){return new Set([s.background.asset,...s.nodes.flatMap(n=>[n.asset,n.fontAsset,...M.cssAssets(n.plugin?.css?.enabled?n.plugin.css.code:''),...M.cssAssets([n.plugin?.appearance?.background,n.plugin?.appearance?.gradient,...(n.plugin?.rules||[]).map(r=>r.set.background)].filter(Boolean).join(';'))]),...M.cssAssets(JSON.stringify(s.themeVariables)),...M.cssAssets(s.customCSS?.enabled?s.customCSS.code:'')].filter(Boolean));}
  function replaceAssetReferences(s,oldId,newId){
    if(!/^[\w-]+$/.test(oldId)||!/^[\w-]+$/.test(newId))throw Error('素材 ID 无效');if(oldId===newId)return s;
    if(s.background?.asset===oldId)s.background.asset=newId;for(const n of s.nodes||[])for(const key of ['asset','fontAsset'])if(n[key]===oldId)n[key]=newId;
    const escaped=oldId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),marked=new RegExp('([uU][rR][lL]\\(\\s*["\']?muyu-asset:)'+escaped+'(?![\\w-])','g'),seen=new WeakSet();
    function visit(value){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);for(const [key,item]of Object.entries(value))if(typeof item==='string')value[key]=item.replace(marked,(_,prefix)=>prefix+newId);else visit(item);}
    visit(s);return s;
  }
  function serialize(s){return JSON.stringify(validate(s),null,2);}
  function deserialize(text){try{return validate(JSON.parse(text));}catch(e){if(e instanceof SyntaxError)throw Error('工程 JSON 损坏，无法读取。');throw e;}}
  function bounds(nodes){if(!nodes.length)return null;const points=nodes.flatMap(n=>{const r=n.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return [[-n.w/2,-n.h/2],[n.w/2,-n.h/2],[n.w/2,n.h/2],[-n.w/2,n.h/2]].map(([x,y])=>({x:n.x+n.w/2+x*c-y*s,y:n.y+n.h/2+x*s+y*c}));});const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};}
  function viewport(s,w,h){const scale=(s.fit==='cover'?Math.max:Math.min)(w/s.width,h/s.height);return{scale,w:s.fit==='responsive'?w/scale:s.width,h:s.fit==='responsive'?h/scale:s.height,x:(w-(s.fit==='responsive'?w:s.width*scale))/2,y:(h-(s.fit==='responsive'?h:s.height*scale))/2};}
  function position(s,n,v){const ax=n.anchor.includes('left')?0:n.anchor.includes('right')?1:0.5,ay=n.anchor.includes('top')?0:n.anchor.includes('bottom')?1:0.5;return{x:n.x+(v.w-s.width)*ax,y:n.y+(v.h-s.height)*ay};}
  class History {constructor(s){this.reset(s);}reset(s){this.items=[clone(s)];this.index=0;}push(s){if(JSON.stringify(this.items[this.index])===JSON.stringify(s))return false;this.items.splice(this.index+1);this.items.push(clone(s));if(this.items.length>80)this.items.shift();this.index=this.items.length-1;return true;}undo(){return this.index>0?clone(this.items[--this.index]):null;}redo(){return this.index<this.items.length-1?clone(this.items[++this.index]):null;}get canUndo(){return this.index>0;}get canRedo(){return this.index<this.items.length-1;}}
  return{VERSION,TYPES,clone,id,clamp,node,blank,validate,serialize,deserialize,usedAssets,replaceAssetReferences,bounds,viewport,position,History};
});
