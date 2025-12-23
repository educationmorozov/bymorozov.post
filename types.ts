
export enum SplitType {
  EMPTY_LINE = 'EMPTY_LINE',
  DASHES = 'DASHES',
  SLIDE_N = 'SLIDE_N'
}

export enum AspectRatio {
  PORTRAIT = '1080x1350',
  SQUARE = '1080x1080'
}

export enum NickPosition {
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
  TOP_RIGHT = 'TOP_RIGHT'
}

export interface SlideData {
  id: number;
  text: string;
  isOverflowing?: boolean;
}

export enum TemplateId {
  WHITE_MINIMAL = 'WHITE_MINIMAL',
  BLACK_MINIMAL = 'BLACK_MINIMAL',
  PASTEL = 'PASTEL',
  GRADIENT = 'GRADIENT',
  NOTES = 'NOTES',
  CARD = 'CARD'
}

export interface DesignConfig {
  templateId: TemplateId;
  aspectRatio: AspectRatio;
  nickname: string;
  avatarUrl: string | null;
  nickPosition: NickPosition;
  showPageNumber: boolean;
}
