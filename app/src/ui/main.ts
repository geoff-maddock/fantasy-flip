// App bootstrap. Wires the DOM renderer to a fresh game session. The engine is
// headless; this file is the only place the browser DOM is touched at startup.
import '../render/dom/theme.css';
import { DomApp } from '../render/dom/app';

const root = document.getElementById('app');
if (root) {
  const app = new DomApp();
  app.mount(root);
}
