/* Install synchronously at end of body, before any load event. */
(function(root){
  'use strict';
  class WallpaperAdapter {
    constructor(renderer){this.renderer=renderer;this.base=Scene.clone(renderer.scene);root.wallpaperPropertyListener={
      applyUserProperties:p=>this.apply(p),
      applyGeneralProperties:p=>{if(Number.isFinite(p.fps)&&p.fps>0){renderer.fpsLimit=Scene.clamp(p.fps,1,240);renderer.wake();}},
      setPaused:p=>renderer.setPaused(!!p)
    };
      if(typeof root.wallpaperRegisterAudioListener==='function'&&this.base.nodes.some(n=>n.type==='audio'))root.wallpaperRegisterAudioListener(a=>renderer.setAudio(a));
    }
    apply(p){p=p||{};if(Object.prototype.hasOwnProperty.call(p,'companiontoken')&&typeof root.InfoRuntime?.setCompanionConnection==='function')root.InfoRuntime.setCompanionConnection(root.MUYU_LOCAL_CONNECTION||p.companiontoken?.value);
      if(!['themecolor','animationspeed','effectintensity','showclock','showparticles'].some(k=>p[k]))return;
      const s=Scene.clone(this.renderer.scene),base=this.base;
      if(p.themecolor){const rgb=String(p.themecolor.value).trim().split(/\s+/).map(v=>Math.round(Scene.clamp(Number(v),0,1)*255));if(rgb.length===3){s.theme='#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('');for(const n of s.nodes){const original=base.nodes.find(b=>b.id===n.id);if(original?.color===base.theme)n.color=s.theme;if(original?.fill===base.theme)n.fill=s.theme;}}}
      if(p.animationspeed)s.speed=Scene.clamp(p.animationspeed.value,0,5);
      if(p.effectintensity)s.intensity=Scene.clamp(p.effectintensity.value,0,2);
      if(p.showclock)for(const n of s.nodes.filter(n=>n.type==='clock'||n.type==='plugin'&&['clock','analog'].includes(n.plugin.definition)))n.visible=!!p.showclock.value&&base.nodes.find(b=>b.id===n.id).visible;
      if(p.showparticles)s.effects.type=p.showparticles.value?base.effects.type:'none';
      if(p.themecolor)s.themeVariables.accent=s.theme;
      this.renderer.setScene(s);
    }
  }
  root.WallpaperAdapter=WallpaperAdapter;
})(globalThis);
