(function(){
  'use strict';
  const M=InfoModel,S=Scene,host=document.querySelector('#host'),inspector=document.querySelector('#inspector'),raw=document.querySelector('#raw'),summary=document.querySelector('#summary'),results=document.querySelector('#results');
  const assert=(v,m)=>{if(!v)throw Error(m);},equal=(a,b,m)=>assert(JSON.stringify(a)===JSON.stringify(b),m+'：'+JSON.stringify(a)+' / '+JSON.stringify(b)),wait=ms=>new Promise(r=>setTimeout(r,ms));
  let scene,history,renderer,report,api;const downloads=[],memory=new Map(),notices=[];
  const node=()=>scene.nodes[0],plugin=()=>node().plugin,view=()=>renderer.items.get(node().id).pluginView;
  function fixture(){const s=S.blank('独立样式验证工程');s.sources=[M.source('json','sample',{data:{percent:62,charging:true,remainingSeconds:7200,value:62}})];s.nodes=[S.node('plugin',{x:380,y:200,w:840,h:620,plugin:M.makePlugin('battery','sample')})];return S.validate(s);}
  function refresh(){inspector.replaceChildren();InfoEditor.inspector(inspector,S.clone(node()));}
  function apply(fn,{draw=true}={}){const draft=S.clone(scene);fn(draft);const valid=S.validate(draft);scene=valid;history.push(scene);renderer.setScene(scene);if(draw)refresh();}
  function control(label){const input=[...inspector.querySelectorAll('[aria-label]')].find(e=>e.getAttribute('aria-label')===label);assert(input,'缺少真实控件：'+label);return input;}
  function input(label,value){const e=control(label);if(e.type==='checkbox')e.checked=!!value;else e.value=String(value??'');e.dispatchEvent(new Event(e.tagName==='SELECT'||e.type==='checkbox'?'change':'input',{bubbles:true}));return e;}
  function click(text,root=inspector){const e=[...root.querySelectorAll('button')].find(e=>e.textContent.trim()===text);assert(e,'缺少真实按钮：'+text);e.click();return e;}
  async function check(name,fn){summary.textContent='正在验证：'+name;const row=document.createElement('p');results.append(row);try{const detail=await fn();report.tests.push({name,pass:true,...(detail?{detail}:{})});row.className='pass';row.textContent='✓ '+name;}catch(e){report.tests.push({name,pass:false,error:e.message});row.className='fail';row.textContent='✗ '+name+'：'+e.message;}raw.textContent=JSON.stringify(report,null,2);}
  document.querySelector('#undo').onclick=()=>{const prior=history?.undo();if(prior){scene=prior;renderer.setScene(scene);refresh();}};
  document.querySelector('#redo').onclick=()=>{const next=history?.redo();if(next){scene=next;renderer.setScene(scene);refresh();}};
  document.querySelector('#run').onclick=async function(){
    this.disabled=true;renderer?.destroy();scene=fixture();history=new S.History(scene);renderer=new WallpaperRenderer(host);renderer.setScene(scene);downloads.length=0;memory.clear();notices.length=0;results.replaceChildren();
    report={environment:{userAgent:navigator.userAgent,dpr:devicePixelRatio,time:new Date().toISOString(),storage:'仅测试内存 Map；不使用主工程 IndexedDB',wallpaperEngine:'未进行实机测试'},tests:[]};
    const store={get:async(_,key)=>S.clone(memory.get(key)??null),transaction:async(_,__,callback)=>callback({objectStore:()=>({put:(value,key)=>memory.set(key,S.clone(value)),delete:key=>memory.delete(key)})})};
    api={get scene(){return S.clone(scene);},get selected(){return[node().id];},renderer,get assets(){return new Map();},get history(){return history;},edit:fn=>apply(fn),liveEdit:fn=>apply(fn,{draw:false}),refresh,notify:(message,error=false)=>{notices.push({message,error});document.querySelector('#notice').textContent=message;},getStore:()=>store,download:(blob,name)=>downloads.push({blob,name}),select:()=>{},addNode:()=>{},applyScene:s=>{scene=S.validate(s);history.push(scene);renderer.setScene(scene);refresh();},openModal:()=>{api.closeModal();const dialog=document.querySelector('#modal'),body=document.querySelector('#modal-content');body.replaceChildren();dialog.showModal();return body;},closeModal:()=>{const dialog=document.querySelector('#modal');dialog.dispatchEvent(new Event('muyu:modal-dispose'));if(dialog.open)dialog.close();}};
    await InfoEditor.init(api);
    try{
      await check('10 个外观的实际下拉操作完整重置；4 个语义预设切换真实图表',()=>{
        const semantic={dashboard:'gauge',ring:'ring',segmented:'segments',liquid:'liquid'},visited=[];
        for(const [id,preset]of Object.entries(M.appearances)){
          api.edit(s=>Object.assign(s.nodes[0].plugin.appearance,{blur:33,glow:42,font:'serif',shape:'ellipse',radiusX:119,gradient:'linear-gradient(red, blue)',backgroundOpacity:.13}));
          const beforeView=plugin().view;input('外观预设',id);equal(plugin().appearance,preset.appearance,'预设残留 '+id);equal(plugin().view,semantic[id]||beforeView,'展示未切换 '+id);assert(!view().cssError,'渲染外观错误 '+id+': '+view().cssError);
          if(id==='segmented')assert(view().shadow.querySelectorAll('.muyu-segment').length===20,'分段预设没有实际分段');
          if(id==='liquid')assert(view().shadow.querySelector('.muyu-liquid-fill'),'液体预设没有液面');
          if(id==='dashboard')assert(view().shadow.querySelector('[data-gauge="true"]'),'仪表预设没有实际仪表');
          if(id==='ring')assert(view().shadow.querySelector('[data-gauge="false"]'),'环形预设没有实际环形');visited.push(id);
        }return{presets:visited,semanticViews:semantic};
      });
      await check('完全透明按钮去除渐变、模糊、边框与阴影，同时保持文字不透明',()=>{
        api.edit(s=>{Object.assign(s.nodes[0].plugin.appearance,{background:'#334455',gradient:'linear-gradient(red, blue)',backgroundOpacity:1,blur:30,borderWidth:8,shadow:50});s.nodes[0].border=5;s.nodes[0].shadow=30;});
        click('完全透明 · 仅保留内容');const a=plugin().appearance;for(const key of ['backgroundOpacity','blur','borderWidth','shadow'])assert(a[key]===0,key+' 未清除');assert(a.background==='transparent'&&a.gradient==='','背景未完全清除');assert(node().border===0&&node().shadow===0,'外层装饰未清除');assert(getComputedStyle(view().card,'::before').opacity==='0','实际背景没有透明');assert(getComputedStyle(view().card).opacity==='1','整体透明度降低');assert(getComputedStyle(view().shadow.querySelector('.muyu-value')).opacity==='1','文字透明度降低');
      });
      await check('背景不透明度独立控制背景，不改变文字和图表',()=>{
        input('背景填充','color');input('背景不透明度 %',25);equal(plugin().appearance.backgroundOpacity,.25,'alpha 参数错误');equal(getComputedStyle(view().card,'::before').opacity,'0.25','实际背景 alpha 错误');equal(getComputedStyle(view().card).opacity,'1','内容透明度被降低');
      });
      await check('椭圆轮廓实际呈现；正圆按钮统一宽高并锁定比例',()=>{
        input('轮廓形状','ellipse');equal(getComputedStyle(view().card).borderRadius,'50%','椭圆 CSS 错误');assert(node().w!==node().h,'测试初始应为椭圆');click('设为正圆并锁定比例');assert(node().w===node().h&&node().keepRatio&&plugin().appearance.shape==='ellipse','正圆尺寸或比例锁错误');
      });
      await check('分段数量、间距、方向、圆角和渐变填充驱动实际 DOM',()=>{
        input('外观预设','segmented');input('分段数量',13);input('分段间距 px',9);input('分段圆角 px',6);input('分段方向','vertical');input('分段填充','gradient');
        const segments=view().shadow.querySelector('.muyu-segments'),cells=segments.querySelectorAll('.muyu-segment');equal(cells.length,13,'段数不生效');equal(getComputedStyle(segments).gap,'9px','段间距不生效');equal(getComputedStyle(segments).flexDirection,'column-reverse','方向不生效');equal(getComputedStyle(cells[0]).borderRadius,'6px','圆角不生效');const lit=[...segments.querySelectorAll('.on')];assert(lit.length>1,'测试进度应点亮多段');assert(lit[0].style.getPropertyValue('--muyu-segment-fill').includes('color-mix'),'未设置逐段渐变高光');assert(getComputedStyle(lit[0],'::before').backgroundColor!==getComputedStyle(lit.at(-1),'::before').backgroundColor,'首尾已点亮分段没有实际渐变区别');
      });
      await check('环形数字字号采用输入值，独立于容器尺寸',()=>{
        input('外观预设','ring');input('数字字号',95);equal(plugin().appearance.fontSize,95,'字号未保存');equal(getComputedStyle(view().shadow.querySelector('.muyu-value')).fontSize,'95px','环形字号未呈现');
      });
      await check('三个 nullable 圆角均可清空，恢复主题继承',()=>{
        input('轮廓形状','rounded');for(const [label,key]of [['水平圆角 px（空白继承）','radiusX'],['垂直圆角 px（空白继承）','radiusY'],['统一圆角 px','radius']]){input(label,45);equal(plugin().appearance[key],45,'圆角输入未应用');input(label,'');equal(plugin().appearance[key],null,'清空没有恢复继承 '+key);}
        equal(getComputedStyle(view().card).borderRadius,'24px','主题圆角没有恢复');
      });
      await check('清空背景与渐变不会再触发 --bg 缺少值错误',()=>{
        input('背景渐变 CSS（可清空）','linear-gradient(45deg, #123456, #789abc)');input('背景渐变 CSS（可清空）','');const e=input('背景颜色 / CSS 变量','');equal(plugin().appearance.background,'transparent','空背景未规范化');assert(!e.hasAttribute('aria-invalid'),'背景控件报错');assert(!view().cssError,'渲染 CSS 报错');assert(S.validate(scene),'工程不可序列化');
      });
      await check('无效渐变在原控件显示内联错误，保持最后有效场景并可修正',()=>{
        const before=S.serialize(scene),e=input('背景渐变 CSS（可清空）','linear-gradient(');equal(S.serialize(scene),before,'无效 CSS 覆盖了工程');assert(e.getAttribute('aria-invalid')==='true','没有无效标识');assert(!e.closest('label').querySelector('.field-error').hidden,'没有内联错误');input('背景渐变 CSS（可清空）','linear-gradient(45deg, red, blue)');assert(!e.hasAttribute('aria-invalid'),'修正后错误未清除');assert(plugin().appearance.gradient.includes('gradient'),'修正未应用');
      });
      await check('选择没有单位的声明字段会清除旧百分比单位及换算',()=>{
        input('选择已声明字段','percent');equal(plugin().options.unit,'%','百分比选择失败');input('选择已声明字段','charging');equal(plugin().options.unit,'','旧单位残留');equal(plugin().options.scale,1,'旧倍率残留');equal(plugin().options.offset,0,'旧偏移残留');input('选择已声明字段','percent');
      });
      await check('保存样式包含展示组件，个人样式重新应用保留布局与全部外观',async()=>{
        input('外观预设','segmented');input('分段数量',17);input('轮廓形状','capsule');const expected=S.clone(plugin());click('保存此样式');await wait(0);const downloaded=downloads.findLast(d=>d.name==='muyu-style.json');assert(downloaded,'没有样式导出');const saved=JSON.parse(await downloaded.blob.text());equal(saved.view,'segments','样式遗漏 view');equal(saved.appearance,expected.appearance,'样式外观不完整');assert(memory.get('muyu-styles')?.length===1,'未写入测试内存存储');input('外观预设','glass');input('应用个人样式',saved.name);equal(plugin().view,expected.view,'个人样式展示丢失');equal(plugin().appearance,expected.appearance,'个人样式外观丢失');equal(plugin().options.padding,expected.options.padding,'个人样式布局丢失');return{view:saved.view,segmentCount:saved.appearance.segmentCount,store:'内存 Map'};
      });
      await check('真实 CSS 工作区拒绝无效文本，修正后应用且可以关闭预览',()=>{
        const before=S.serialize(scene);click('局部 CSS 编辑器');const dialog=document.querySelector('#modal'),area=dialog.querySelector('[aria-label="CSS 代码"]');assert(dialog.open&&area,'代码工作区未打开');area.value='.muyu-value { color:';area.dispatchEvent(new Event('input',{bubbles:true}));assert(dialog.querySelector('.code-diagnostics.invalid'),'无效 CSS 缺少诊断');click('确认应用',dialog);equal(S.serialize(scene),before,'无效代码覆盖有效工程');area.value='.muyu-value { letter-spacing: 4px; }';area.dispatchEvent(new Event('input',{bubbles:true}));click('确认应用',dialog);assert(!dialog.open,'确认后未关闭');equal(getComputedStyle(view().shadow.querySelector('.muyu-value')).letterSpacing,'4px','CSS 应用无效');
      });
      await check('通过控件修改后，撤销和重做恢复外观及实际呈现',()=>{
        const before=plugin().appearance.fontSize;input('数字字号',73);equal(plugin().appearance.fontSize,73,'修改失败');document.querySelector('#undo').click();equal(plugin().appearance.fontSize,before,'撤销失败');document.querySelector('#redo').click();equal(plugin().appearance.fontSize,73,'重做失败');equal(getComputedStyle(view().shadow.querySelector('.muyu-value')).fontSize,'73px','重做未刷新呈现');
      });
      await check('工程 ZIP 往返保留控件外观、分段、CSS、绑定与图层尺寸',async()=>{
        const before=S.serialize(scene),pack=await Packages.project(scene,new Map()),opened=await Packages.open(pack);equal(S.serialize(opened.scene),before,'工程包往返不一致');api.applyScene(opened.scene);equal(view().shadow.querySelectorAll('.muyu-segment').length,17,'重开后分段丢失');equal(getComputedStyle(view().shadow.querySelector('.muyu-value')).letterSpacing,'4px','重开后 CSS 丢失');return{archiveBytes:pack.size};
      });
    }finally{api.closeModal();const failed=report.tests.filter(t=>!t.pass).length;report.summary={passed:report.tests.length-failed,failed,total:report.tests.length};raw.textContent=JSON.stringify(report,null,2);summary.textContent=`完成：${report.summary.passed} 通过 / ${failed} 失败（不涉及 Wallpaper Engine 实机）`;this.disabled=false;}
  };
})();
