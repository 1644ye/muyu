/* IndexedDB blobs are never put in localStorage. Snapshots commit atomically. */
(function(root){
  class ProjectStore {
    async init(name='muyu-studio'){this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{for(const name of ['projects','assets','settings','templates'])r.result.createObjectStore(name);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('数据库被其他窗口占用，请关闭旧标签页后重试'));});this.known=new Set();return this;}
    async transaction(names,mode,callback){return new Promise((resolve,reject)=>{const tx=this.db.transaction(names,mode);let result;try{result=callback(tx);}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('本地存储失败'));tx.onabort=()=>reject(tx.error||Error('本地保存中断'));});}
    async get(store,key){return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async save(scene,assets){const pending=scene.assets.filter(a=>!this.known.has(a.id));await this.transaction(['projects','assets','settings'],'readwrite',tx=>{for(const a of pending){const blob=assets.get(a.id);if(!blob)throw Error('素材缺失：'+a.name);tx.objectStore('assets').put(blob,a.id);}tx.objectStore('projects').put(Scene.clone(scene),scene.id);tx.objectStore('settings').put(scene.id,'current');});for(const a of pending)this.known.add(a.id);}
    async load(id){id=id||await this.get('settings','current');if(!id)return null;const raw=await this.get('projects',id);if(!raw)return null;const scene=Scene.validate(raw),assets=new Map();for(const a of scene.assets){const blob=await this.get('assets',a.id);if(blob){assets.set(a.id,blob);this.known.add(a.id);}}return{scene,assets};}
    async list(store='projects'){return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async saveTemplate(scene,assets){await this.save(scene,assets);const copy=Scene.clone(scene);copy.id=Scene.id();await this.transaction(['templates'],'readwrite',tx=>tx.objectStore('templates').put(copy,copy.id));return copy;}
    async templateAssets(s){const m=new Map();for(const a of s.assets){const b=await this.get('assets',a.id);if(b)m.set(a.id,b);}return m;}
    async deleteTemplate(id){await this.transaction(['templates'],'readwrite',tx=>tx.objectStore('templates').delete(id));}
    async prune(){const snapshots=[...await this.list(),...await this.list('templates')],used=new Set(snapshots.flatMap(s=>s.assets.map(a=>a.id)));return new Promise((resolve,reject)=>{const tx=this.db.transaction('assets','readwrite'),req=tx.objectStore('assets').openCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;if(!used.has(cursor.key)){this.known.delete(cursor.key);cursor.delete();}cursor.continue();};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  }
  root.ProjectStore=ProjectStore;
})(globalThis);
