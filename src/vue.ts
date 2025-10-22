import type { App, SetupContext, Slots, VNode } from 'vue';
import { cloneVNode, defineComponent, h, onMounted, onUpdated, ref } from 'vue';

import { Clip as ClipElement } from './components/clip.js';
import { Files as FilesElement } from './components/files.js';
import { Image as ImageElement } from './components/img.js';
import { List as ListElement } from './components/list.js';
import { Player as PlayerElement } from './components/player.js';
import { Pop as PopElement } from './components/pop.js';
import { Text as TextElement } from './components/text.js';
import { Upload as UploadElement } from './components/upload.js';

type RegistryEntry = {
  tag: `${string}-${string}`;
  element: CustomElementConstructor;
};

const registry: Record<string, RegistryEntry> = {
  Clip: { tag: 'mave-clip', element: ClipElement },
  Files: { tag: 'mave-files', element: FilesElement },
  Image: { tag: 'mave-img', element: ImageElement },
  List: { tag: 'mave-list', element: ListElement },
  Player: { tag: 'mave-player', element: PlayerElement },
  Pop: { tag: 'mave-pop', element: PopElement },
  Text: { tag: 'mave-text', element: TextElement },
  Upload: { tag: 'mave-upload', element: UploadElement },
};

function ensureDefined(tag: string, element: CustomElementConstructor) {
  if (typeof window === 'undefined') return;
  if (!window.customElements) return;
  if (!window.customElements.get(tag)) {
    window.customElements.define(tag, element);
  }
}

function projectSlots(slots: Slots): VNode[] | undefined {
  const content: VNode[] = [];

  if (slots.default) {
    content.push(...slots.default());
  }

  for (const [slotName, slotFn] of Object.entries(slots)) {
    if (!slotFn || slotName === 'default') continue;
    const slotNodes = slotFn();
    for (const node of slotNodes) {
      content.push(cloneVNode(node, { slot: slotName }));
    }
  }

  return content.length ? content : undefined;
}

function syncSlotAttributes(root: HTMLElement | null) {
  if (!root || typeof window === 'undefined' || !root.ownerDocument) return;

  const visit = (element: Element) => {
    const dataSlot = element.getAttribute('data-slot');
    if (dataSlot && element.getAttribute('slot') !== dataSlot) {
      element.setAttribute('slot', dataSlot);
    }
  };

  visit(root);
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    visit(walker.currentNode as Element);
  }
}

function normalizeAttributes(attrs: Record<string, unknown>) {
  const forwarded: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class' || key === 'style' || key === 'key') {
      forwarded[key] = value;
      continue;
    }

    if (key.startsWith('on') && key.length > 2) {
      forwarded[key] = value;
      continue;
    }

    if (value === false || value === undefined || value === null) {
      forwarded[`^${key}`] = null;
      continue;
    }

    if (value === true) {
      forwarded[`^${key}`] = '';
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      forwarded[key] = value;
      continue;
    }

    forwarded[`^${key}`] = value;
  }

  return forwarded;
}

function createVueWrapper(
  componentName: string,
  tag: string,
  element: CustomElementConstructor,
) {
  ensureDefined(tag, element);

  const wrapper = defineComponent({
    name: `Mave${componentName}`,
    inheritAttrs: false,
    setup(_props: Record<string, unknown>, { attrs, slots, expose }: SetupContext) {
      const elementRef = ref<HTMLElement | null>(null);
      expose({ element: elementRef });

      onMounted(() => {
        syncSlotAttributes(elementRef.value);
      });

      onUpdated(() => {
        syncSlotAttributes(elementRef.value);
      });

      return () => {
        const forwardedAttrs = normalizeAttributes(attrs);
        return h(tag, { ref: elementRef, ...forwardedAttrs }, projectSlots(slots));
      };
    },
  });

  return wrapper;
}

const vueComponents = {
  Clip: createVueWrapper('Clip', registry.Clip.tag, registry.Clip.element),
  Files: createVueWrapper('Files', registry.Files.tag, registry.Files.element),
  Image: createVueWrapper('Image', registry.Image.tag, registry.Image.element),
  List: createVueWrapper('List', registry.List.tag, registry.List.element),
  Player: createVueWrapper('Player', registry.Player.tag, registry.Player.element),
  Pop: createVueWrapper('Pop', registry.Pop.tag, registry.Pop.element),
  Text: createVueWrapper('Text', registry.Text.tag, registry.Text.element),
  Upload: createVueWrapper('Upload', registry.Upload.tag, registry.Upload.element),
};

export const Clip = vueComponents.Clip;
export const Files = vueComponents.Files;
export const Image = vueComponents.Image;
export const List = vueComponents.List;
export const Player = vueComponents.Player;
export const Pop = vueComponents.Pop;
export const Text = vueComponents.Text;
export const Upload = vueComponents.Upload;

export function registerMaveComponents(app: App) {
  Object.entries(vueComponents).forEach(([name, component]) => {
    app.component(name, component);
  });
}

export default {
  install(app: App) {
    registerMaveComponents(app);
  },
};
