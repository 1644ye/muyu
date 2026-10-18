const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../js/info-model.js'),S=require('../js/scene.js'),C=require('../js/info-css.js');

function project(){const scene=S.blank('样式往返'),source=M.source('json','sample',{data:{value:62}});scene.sources.push(source);scene.nodes.push(S.node('plugin',{plugin:M.makePlugin('goal',source.id)}));return scene;}

test('clearing a background restores transparent without invalid empty CSS declarations',()=>{
  const scene=project(),a=scene.nodes[0].plugin.appearance;a.background='  ';a.gradient=' \n ';
  const result=S.validate(scene);assert.equal(result.nodes[0].plugin.appearance.background,'transparent');assert.equal(result.nodes[0].plugin.appearance.gradient,'');
  assert.equal(scene.nodes[0].plugin.appearance.background,'  ','validation must not mutate the caller');
  assert.deepEqual(S.deserialize(S.serialize(result)),result);
});

test('older partial styles receive new defaults while keeping existing choices',()=>{
  const scene=project();scene.nodes[0].plugin.appearance={preset:'neon',background:'#12345678',color:'#fedcba',radius:91,fontSize:67};
  const a=S.validate(scene).nodes[0].plugin.appearance;
  assert.equal(a.background,'#12345678');assert.equal(a.radius,91);assert.equal(a.fontSize,67);
  assert.equal(a.backgroundOpacity,1);assert.equal(a.shape,'rounded');assert.equal(a.radiusX,null);assert.equal(a.segmentCount,20);assert.equal(a.segmentGap,6);
  assert.deepEqual(Object.keys(a).sort(),Object.keys(M.appearance).sort());
});

test('native shape fill opacity migrates separately from layer and border opacity',()=>{
  const scene=S.blank(),shape=S.node('shape',{fill:'#123456',border:4,borderColor:'#abcdef',opacity:.8});delete shape.fillOpacity;scene.nodes.push(shape);
  const restored=S.validate(scene);assert.equal(restored.nodes[0].fillOpacity,1);restored.nodes[0].fillOpacity=0;
  const reopened=S.deserialize(S.serialize(restored)).nodes[0];assert.equal(reopened.fillOpacity,0);assert.equal(reopened.opacity,.8);assert.equal(reopened.border,4);assert.equal(reopened.fill,'#123456');
  for(const value of [-1,1.1,NaN]){const bad=S.clone(restored);bad.nodes[0].fillOpacity=value;assert.throws(()=>S.validate(bad),/填充透明度/);}
});

test('normalization never silently drops unknown appearance fields',()=>{
  const scene=project();scene.nodes[0].plugin.appearance.unsupportedOption=123;
  const normalized=M.normalizeAppearance(scene.nodes[0].plugin.appearance);assert.equal(normalized.unsupportedOption,123);
  assert.throws(()=>S.validate(scene),/appearance\/unsupportedOption.*未知字段/);
});

test('every named preset produces a complete valid appearance without leaking metadata',()=>{
  for(const [id,preset]of Object.entries(M.appearances)){
    const scene=project(),p=scene.nodes[0].plugin;M.applyAppearancePreset(p,id);
    assert.equal(p.appearance.preset,id);assert.equal(p.options.padding,preset.padding);
    for(const key of ['name','padding','view'])assert.equal(Object.hasOwn(p.appearance,key),false,id+' leaked '+key);
    assert.deepEqual(Object.keys(p.appearance).sort(),Object.keys(M.appearance).sort());
    assert.deepEqual(M.validateSchema(p.appearance,M.styleSchema),[]);assert.ok(S.validate(scene));
  }
});

test('semantic presets switch actual views and optional changeView leaves the binding intact',()=>{
  const p=M.makePlugin('memory','system');
  for(const [preset,view]of [['segmented','segments'],['dashboard','gauge'],['liquid','liquid'],['ring','ring']]){M.applyAppearancePreset(p,preset);assert.equal(p.view,view);assert.equal(p.sourceId,'system');assert.equal(p.field,'memory.percent');}
  M.applyAppearancePreset(p,'segmented',{changeView:false});assert.equal(p.view,'ring');
  for(const preset of ['minimal','glass','terminal','pixel','neon','panel']){M.applyAppearancePreset(p,preset);assert.equal(p.view,'ring');}
});

test('switching presets resets blur, glow, fonts, opacity and custom geometry',()=>{
  const p=M.makePlugin('goal','sample');M.applyAppearancePreset(p,'terminal');M.applyAppearancePreset(p,'glass');M.applyAppearancePreset(p,'neon');
  Object.assign(p.appearance,{shape:'ellipse',backgroundOpacity:.2,radiusX:120,shadowX:-30});M.applyAppearancePreset(p,'panel');
  assert.equal(p.appearance.blur,0);assert.equal(p.appearance.glow,0);assert.equal(p.appearance.font,null);assert.equal(p.appearance.backgroundOpacity,1);assert.equal(p.appearance.shape,'rounded');assert.equal(p.appearance.radiusX,null);assert.equal(p.appearance.shadowX,0);
  M.applyAppearancePreset(p,'minimal');for(const field of ['blur','glow','shadow','borderWidth','backgroundOpacity'])assert.equal(p.appearance[field],0);assert.equal(p.appearance.background,'transparent');
  p.appearance.color='red';assert.notEqual(M.appearances.minimal.appearance.color,'red');
});

test('transparent ellipse with independent radii, segment geometry and signed shadow survives serialization',()=>{
  const scene=project(),p=scene.nodes[0].plugin;Object.assign(p.appearance,{shape:'ellipse',background:'transparent',backgroundOpacity:0,radiusX:60,radiusY:18,borderStyle:'dashed',shadowColor:'#11223344',shadowX:-12,shadowY:-4,trackColor:'transparent',trackOpacity:0,chartWidth:7,chartHeight:41,segmentCount:37,segmentGap:3.5,segmentRadius:2,segmentDirection:'vertical',segmentFill:'gradient',animationDuration:2700,letterSpacing:-2});
  assert.deepEqual(S.deserialize(S.serialize(scene)),scene);
  for(const [key,value]of [['backgroundOpacity',1.1],['trackOpacity',-1],['shape','triangle'],['radiusX','10px'],['segmentCount',3.5],['segmentCount',101],['segmentDirection','diagonal'],['animationDuration',0],['borderStyle','random']]){const bad=S.clone(scene);bad.nodes[0].plugin.appearance[key]=value;assert.throws(()=>S.validate(bad),new RegExp('appearance/'+key));}
});

test('CSS quoted semicolons, comment markers and nested functions remain valid and unchanged',()=>{
  const code='.x::before { content: "a;b /* literal */ url(https://example.com)"; font-family: "name;with;semicolons", sans-serif; width: calc(100% - var(--space, 10px)); }';
  assert.deepEqual(C.validate(code),[]);assert.equal(C.compile(code,()=>{throw Error('quoted URL is text');}),code);
  const asset='.x { content: "url(muyu-asset:ignored)"; background: URL("muyu-asset:real"); }';
  assert.equal(C.compile(asset,id=>{assert.equal(id,'real');return'assets/real.png';}),'.x { content: "url(muyu-asset:ignored)"; background: url("assets/real.png"); }');
});

test('CSS empty values and mismatched parentheses produce useful diagnostics',()=>{
  assert.match(C.validate('.x {\n  --bg: /* empty */;\n}')[0].message,/--bg.*缺少值/);
  assert.ok(C.validate('.x { width: calc(100% - 4px; }').some(e=>/括号未闭合/.test(e.message)));
  assert.ok(C.validate('.x { color: rgb(1,2,3)); }').some(e=>/不匹配/.test(e.message)));
  assert.ok(C.validate('.x { color: red; } trailing').some(e=>/声明块外/.test(e.message)));
  assert.deepEqual(C.validate('@media (min-width: 600px) { .x:hover { color: var(--color, red); } } @keyframes pulse { from { opacity: .5; } to { opacity: 1; } }'),[]);
});

test('single CSS values preserve data URI semicolons and prevent declaration injection',()=>{
  const data='url("data:image/png;base64,aGVsbG8=")';assert.equal(C.value(data,()=>null),data);assert.equal(C.value('"x;y;z"',()=>null),'"x;y;z"');
  assert.equal(C.value('url(muyu-asset:poster)',()=> 'assets/poster.png'),'url("assets/poster.png")');
  assert.throws(()=>C.value('red; position:fixed',()=>null),/不能插入/);assert.throws(()=>C.value('',()=>null),/缺少值/);
});

test('asset replacement reaches CSS, rules, themes and saved defaults without prefix or plain-data changes',()=>{
  const scene=project(),p=scene.nodes[0].plugin;scene.background.asset='a';scene.nodes[0].asset='a';scene.nodes[0].fontAsset='a';
  scene.assets=[{id:'a',name:'透明 背景.png',kind:'image',ext:'png'},{id:'ab',name:'另一个图片.png',kind:'image',ext:'png'},{id:'replacement',name:'替换 椭圆.png',kind:'image',ext:'png'}];
  scene.customCSS={enabled:true,code:'.x { background: url(muyu-asset:a); mask: url("muyu-asset:ab"); --other: url(muyu-asset:A); }'};
  p.css={enabled:true,code:'.x { background: URL( "muyu-asset:a" ); }'};p.appearance.background='url(muyu-asset:a)';p.rules=[{when:{field:'value',op:'gt',value:50},set:{background:"url('muyu-asset:a')"}}];
  scene.themeVariables.background='url(muyu-asset:a)';scene.stylePresets=[{appearance:{background:'url(muyu-asset:a)'}}];scene.pluginDefinitions=[{defaults:{background:'url(muyu-asset:a)'}}];scene.sources[0].config.data.plain='a';scene.sources[0].config.data.description='背景文件 透明 背景.png';
  assert.equal(S.replaceAssetReferences(scene,'a','replacement'),scene);assert.equal(scene.background.asset,'replacement');assert.equal(scene.nodes[0].asset,'replacement');assert.equal(scene.nodes[0].fontAsset,'replacement');
  assert.match(scene.customCSS.code,/url\(muyu-asset:replacement\)/);assert.match(scene.customCSS.code,/url\("muyu-asset:ab"\)/);assert.match(scene.customCSS.code,/url\(muyu-asset:A\)/);assert.match(p.css.code,/URL\( "muyu-asset:replacement" \)/);assert.equal(p.rules[0].set.background,"url('muyu-asset:replacement')");assert.deepEqual(M.cssAssets(p.css.code),['replacement']);
  assert.equal(scene.themeVariables.background,'url(muyu-asset:replacement)');assert.equal(scene.stylePresets[0].appearance.background,'url(muyu-asset:replacement)');assert.equal(scene.pluginDefinitions[0].defaults.background,'url(muyu-asset:replacement)');assert.equal(scene.assets[0].id,'a');assert.equal(scene.assets[0].name,'透明 背景.png');assert.equal(scene.sources[0].config.data.plain,'a');assert.equal(scene.sources[0].config.data.description,'背景文件 透明 背景.png');
});

test('new builtin plugins use an actually translucent glass surface by default',()=>{
  const p=M.makePlugin('cpu','v');assert.deepEqual(p.appearance,M.appearances.glass.appearance);assert.match(p.appearance.background,/^#[\da-f]{8}$/i);assert.ok(parseInt(p.appearance.background.slice(-2),16)<255);assert.ok(p.appearance.blur>0);
});
