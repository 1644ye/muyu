fetch('/__muyu_health').then(r=>r.json()).then(d=>{if(d.version)document.title+=' · '+d.version;}).catch(()=>{});
