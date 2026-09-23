// Adaptation du tracé et de la caméra de la référence, sans son runtime React.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const ref = fs.readFileSync(path.join(root, '../Site — guirlande au scroll-html/Main.dc.html'), 'utf8');
let logic = ref.match(/class Component extends DCLogic \{[\s\S]*?(?=<\/script>)/)[0];
logic = logic.replace('extends DCLogic', 'extends Renderer')
  .replace('_fly(to, dur) {', '_fly(to, dur) {\n    if (matchMedia("(prefers-reduced-motion: reduce)").matches) dur = 1;')
  .replace('dur = 850;', 'dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 850;')
  .replace('var SCANS = [];', 'var SCANS = this.files;')
  .replace('var n = Math.max(1, this.props.count ?? 35);', 'var n = SCANS.length;')
  .replace('var showAll = !!this.props.showAll;', 'var showAll = matchMedia("(prefers-reduced-motion: reduce)").matches;')
  .replace('var sway = this.props.sway ?? true;', 'var sway = !matchMedia("(prefers-reduced-motion: reduce)").matches;')
  .replace('var narrow = el.clientWidth > 0', 'var erased = this._lenAt(g, (vh * 0.12 - r.top) / Math.max(1, r.height) * g.H);\n    var narrow = el.clientWidth > 0')
  .replace('|| narrow !== !!st.narrow)', '|| Math.abs(erased - (st.erased || 0)) > 0.5 || narrow !== !!st.narrow)')
  .replace('drawn: drawn, narrow: narrow', 'drawn: drawn, narrow: narrow, erased: erased')
  .replace('if (on) shown++;', `if (on) shown++;
      // Garder le compteur de progression, mais retirer les fanions déjà dépassés.
      // Même progression le long de la corde que l'apparition : un fanion après l'autre.
      on = on && (showAll || it.s >= (st.erased || 0));`);
fs.writeFileSync(path.join(root, 'animation.js'), logic + '\nstart(Component);\n');
fs.writeFileSync(path.join(root, 'reference.css'), ref.match(/<style>([\s\S]*?)<\/style>/)[1]);
const files = fs.readdirSync(path.join(root, 'fanions')).filter(x => /\.png$/i.test(x)).sort((a,b) => a.localeCompare(b, 'fr', {numeric:true}));
fs.writeFileSync(path.join(root, 'fanions.js'), 'window.FANIONS = ' + JSON.stringify(files) + ';\n');
