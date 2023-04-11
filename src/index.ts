export { Clip } from './components/clip.js';
export { List } from './components/list.js';
export { Upload } from './components/upload.js';
export { Player };

import { Player } from './components/player.js';
import { Pop } from './components/pop.js';

const pop = new Pop();

document.querySelectorAll('[x-mave-pop]').forEach((el) => {
  if (!document.querySelector('mave-pop')) {
    document.body.appendChild(pop);
  }

  const embed = el.getAttribute('x-mave-pop');
  if (!embed) return;

  const player = new Player();
  player.embed = embed;

  // preload image
  const img = new Image();
  img.src = player.poster;

  el.addEventListener('click', (e) => {
    // how does it handle touch events?
    const event = e as MouseEvent;
    event.preventDefault();

    const players = document.querySelectorAll('mave-player');

    const popped = Array.from(players).find(
      (player) => player.popped && player.embed === embed,
    );

    if (!popped) {
      pop.open(player).then(() => {
        player.play();
      });

      pop.addEventListener('closed', () => {
        player.pause();
      });
    }
  });
});
