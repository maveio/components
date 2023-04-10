export { Clip } from './components/clip.js';
export { List } from './components/list.js';
export { Upload } from './components/upload.js';
export { Player };

import { Player } from './components/player.js';

document.querySelectorAll('[x-mave-pop]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const embed = el.getAttribute('x-mave-pop');
    if (!embed) return;
    const players = document.querySelectorAll('mave-player');

    const popped = Array.from(players).find(
      (player) => player.popped && player.embed === embed,
    );

    if (!popped) {
      const player = new Player();
      player.embed = embed;
      document.body.appendChild(player);
      player.pop({ x: e.clientX, y: e.clientY });
      player.play();
    }
  });
});
