/** Parse subtitle markup as WebVTT, never as arbitrary HTML. */
export function subtitleCueContent(cue: VTTCue): DocumentFragment {
  const content = cue.getCueAsHTML();
  const document = content.ownerDocument;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const multiline: Text[] = [];

  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (text.data.includes('\n')) multiline.push(text);
  }

  // Keep line breaks without reparsing the browser's safe WebVTT nodes as HTML.
  for (const text of multiline) {
    const lines = text.data.split('\n');
    const replacement = document.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index) replacement.append(document.createElement('br'));
      replacement.append(document.createTextNode(line));
    });
    text.replaceWith(replacement);
  }

  return content;
}
