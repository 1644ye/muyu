// Development keeps existing local data; packaged builds use a stable per-user location.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const packaged=fs.existsSync(path.join(__dirname,'distribution.json'));
const base=process.env.MUYU_DATA_DIR?path.resolve(process.env.MUYU_DATA_DIR):packaged?path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'Muyu'):__dirname;
module.exports={packaged,base,runtime:path.join(base,'.runtime'),data:packaged||process.env.MUYU_DATA_DIR?path.join(base,'data'):path.join(__dirname,'companion','data')};
