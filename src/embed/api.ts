export type Embed = {
  id: string;
  name: string;
  space_id: string;
  poster: {
    image_src: string;
    initial_frame_src: string;
    preview_src: string;
    video_src: string;
  };
  settings: {
    aspect_ratio: string;
    autoplay: boolean;
    height: string;
    loop: boolean;
    width: string;
  };
  video: {
    id: string;
    aspect_ratio: string;
    filetype: string;
    original: string;
    sources: {
      mp4: {
        '480p': string;
        '720p': string;
      };
    };
    src: string;
  };
};

export type Collection = {
  id: string;
  name: string;
  embeds: Embed[];
};

export const baseUrl = '__MAVE_ENDPOINT__';
