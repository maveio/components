import { expect, it } from 'vitest';

import { subtitleCueContent } from '../src/utils/subtitle_cues';

it('keeps parsed cue formatting, literal markup, and nested line breaks intact', () => {
  // The browser supplies these nodes through its WebVTT parser. Exercise only
  // our DOM transformation here; native parsing is covered by browser checks.
  const parsed = document.createDocumentFragment();
  const emphasis = document.createElement('i');
  emphasis.textContent = 'first\nsecond';
  parsed.append(
    document.createTextNode('<img src=x onerror=alert(1)>\n'),
    emphasis,
    document.createTextNode('\n\nlast'),
  );
  const cue = { getCueAsHTML: () => parsed } as VTTCue;
  const target = document.createElement('div');

  target.replaceChildren(subtitleCueContent(cue));

  expect(target.querySelector('img')).toBeNull();
  expect(target.firstChild?.textContent).toBe('<img src=x onerror=alert(1)>');
  expect(target.querySelector('i')).toBe(emphasis);
  expect(emphasis.innerHTML).toBe('first<br>second');
  expect(target.querySelectorAll('br')).toHaveLength(4);
  expect(target.lastChild?.textContent).toBe('last');
});

it('replaces the previous cue, including when the next cue is empty', () => {
  const target = document.createElement('div');
  target.textContent = 'previous cue';

  target.replaceChildren(
    subtitleCueContent({
      getCueAsHTML: () => document.createDocumentFragment(),
    } as VTTCue),
  );

  expect(target.childNodes).toHaveLength(0);
});
