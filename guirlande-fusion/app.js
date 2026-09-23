const $ = id => document.getElementById(id);
class Renderer {
  constructor(files) {
    this.files = files; this.props = {}; this.state = {narrow: innerWidth < 640};
    this._wheelDelta = 0; this._wheelLast = 0; this._wheelUntil = 0;
    $('zoom').addEventListener('wheel', e => this.onZoomWheel(e), {passive:false});
  }
  onZoomWheel(e) {
    // Laisser le pincement du pavé tactile / Ctrl + molette au navigateur.
    if (!this.state.zoom || e.ctrlKey) return;
    e.preventDefault();
    const now = performance.now();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (now - this._wheelLast > 180 || Math.sign(delta) !== Math.sign(this._wheelDelta)) this._wheelDelta = 0;
    this._wheelLast = now;
    if (this.state.closing || this._anim || now < this._wheelUntil) {
      this._wheelDelta = 0;
      return;
    }
    this._wheelDelta += delta;
    if (Math.abs(this._wheelDelta) < 30) return;
    const next = (this.state.idx || 0) + Math.sign(this._wheelDelta);
    this._wheelDelta = 0;
    if (next < 0 || next >= this.files.length) return;
    this._wheelUntil = now + 650;
    this._goTo(next);
  }
  setState(patch) { Object.assign(this.state, patch); this.render(); }
  makeStage(stage, v) {
    stage.replaceChildren();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('rope-svg'); svg.setAttribute('viewBox', v.viewBox); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    for (const color of ['#E4D6C3', '#A9784A']) {
      const p = document.createElementNS(svg.namespaceURI, 'path');
      for (const [k,val] of Object.entries({d:v.ropeD,fill:'none',stroke:color,'stroke-width':color === '#A9784A' ? 4.5 : 7,'stroke-linecap':'round','stroke-linejoin':'round'})) p.setAttribute(k,val);
      svg.append(p);
    }
    svg.lastChild.classList.add('corde'); stage.append(svg);
    v.fanions.forEach((f,i) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fanion';
      button.setAttribute('aria-label', 'Agrandir le fanion n°' + f.num);
      const swing = document.createElement('div'); const img = document.createElement('img'); img.className='scan'; img.src=f.src; img.alt='Fanion n°'+f.num; img.draggable=false; swing.append(img); button.append(swing);
      for (const side of ['left','right']) {const bead=document.createElement('div'); bead.className='perle'; bead.style[side]='-5%'; button.append(bead);}
      button.onclick=()=>stage.id==='scene'?this._goTo(i):this._open(i); stage.append(button);
    });
  }
  render() {
    const v=this.renderVals(), key=this._geoKey;
    $('total').textContent=v.n; $('count').textContent=v.n; $('shown').textContent=v.shown;
    const zoom=$('zoom'), wasOpen=zoom.open;
    if(v.zOpen && !wasOpen) {
      this._wheelDelta = 0; this._wheelLast = 0; this._wheelUntil = 0;
      zoom.showModal();
    }
    if(!v.zOpen && wasOpen) {zoom.close(); $('guirlande').querySelectorAll('button')[this.state.idx]?.focus({preventScroll:true});}
    for (const id of ['guirlande','scene']) {
      const stage=$(id);
      if(stage.dataset.geometry!==key){this.makeStage(stage,v);stage.dataset.geometry=key;}
      if(id==='guirlande') stage.style.aspectRatio=v.ratio;
      else {stage.style.height=v.Hpx; if(!this.state.closing) stage.style.transform=v.stageTf;}
      const path=stage.querySelector('.corde'); path.setAttribute('stroke-dasharray',id==='scene'?v.sceneDash:v.total);path.setAttribute('stroke-dashoffset',id==='scene'?v.sceneOff:v.offset);
      stage.querySelectorAll('button').forEach((b,i)=>{
        const f=v.fanions[i]; Object.assign(b.style,{left:f.left,top:f.top,width:f.width,opacity:id==='scene'?f.zOp:f.op,transform:id==='scene'?f.tfOn:f.tf});
        b.disabled=id==='guirlande'&&!f.op; b.firstChild.className=f.swingClass;b.firstChild.style.animationDelay=f.delay;
      });
    }
    $('number').textContent='Fanion n°'+v.zNum; $('position').textContent='/ '+v.n;
    $('prev').disabled=v.atStart; $('next').disabled=v.atEnd;
    zoom.querySelector('.zoom-ui').hidden=!v.showUi;
    $('prev').onclick=v.prev;$('next').onclick=v.next;$('close').onclick=v.close;
    zoom.onkeydown=v.onKey;zoom.ontouchstart=v.onTouchStart;zoom.ontouchend=v.onTouchEnd;
    zoom.oncancel=e=>{e.preventDefault();this._close();};
  }
}
async function start(Component) {
  let names=window.FANIONS||[];
  if(location.protocol!=='file:') {
    try {const res=await fetch('/api/fanions',{cache:'no-store'});if(res.ok) names=await res.json();} catch(e) {console.warn('Utilisation de la liste enregistrée.',e);}
  }
  if(!names.length){$('total').textContent='0';$('count').textContent='0';$('guirlande').textContent='Ajoutez vos PNG dans le dossier fanions, puis actualisez la page.';return;}
  const app=new Component(names.map(name=>'fanions/'+encodeURIComponent(name)));
  app.render(); app.componentDidMount();
}
