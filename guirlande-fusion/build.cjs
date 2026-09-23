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
  .replace('var sway = this.props.sway ?? true;', 'var sway = !matchMedia("(prefers-reduced-motion: reduce)").matches;');
fs.writeFileSync(path.join(root, 'animation.js'), logic + '\nstart(Component);\n');
fs.writeFileSync(path.join(root, 'reference.css'), ref.match(/<style>([\s\S]*?)<\/style>/)[1]);
const files = fs.readdirSync(path.join(root, 'fanions')).filter(x => /\.png$/i.test(x)).sort((a,b) => a.localeCompare(b, 'fr', {numeric:true}));
fs.writeFileSync(path.join(root, 'fanions.js'), 'window.FANIONS = ' + JSON.stringify(files) + ';\n');
