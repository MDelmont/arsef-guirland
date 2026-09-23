const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
const root=__dirname;
const list=()=>fs.readdirSync(path.join(root,'fanions'),{withFileTypes:true}).filter(x=>x.isFile()&&/\.png$/i.test(x.name)).map(x=>x.name).sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  res.setHeader('Cache-Control','no-store');
  if(pathname==='/api/fanions'){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(list()));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Introuvable');return;}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
server.listen(0,'127.0.0.1',()=>{
  const url='http://127.0.0.1:'+server.address().port;
  fs.writeFileSync(path.join(root,'fanions.js'),'window.FANIONS = '+JSON.stringify(list())+';\n');
  console.log('Guirlande : '+url+'\nAjoutez vos PNG dans fanions puis actualisez. Fermez cette fenêtre pour arrêter.');
  if(!process.argv.includes('--no-open')) require('node:child_process').spawn('explorer.exe',[url],{stdio:'ignore',windowsHide:true});
});
