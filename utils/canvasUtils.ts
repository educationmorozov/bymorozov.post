
import { SlideData, DesignConfig, Alignment, NickPosition } from '../types.ts';

export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface TextPart {
  text: string;
  bold: boolean;
  color: string | null;
}

const parseRichText = (text: string): TextPart[] => {
  const parts: TextPart[] = [];
  const regex = /(\*[^*]+\*|\[[^\]]+\]\(#[a-fA-F0-9]{3,6}\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), bold: false, color: null });
    }
    const m = match[0];
    if (m.startsWith('*')) {
      parts.push({ text: m.slice(1, -1), bold: true, color: null });
    } else {
      const colorMatch = /\[([^\]]+)\]\(#([a-fA-F0-9]{3,6})\)/.exec(m);
      if (colorMatch) {
        parts.push({ text: colorMatch[1], bold: false, color: `#${colorMatch[2]}` });
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), bold: false, color: null });
  }
  return parts;
};

const drawWrappedRichText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: Alignment,
  defaultColor: string,
  fontFamily: string,
  fontSize: number
) => {
  const lines = text.split('\n');
  let currentY = y;

  lines.forEach(line => {
    const parts = parseRichText(line);
    ctx.font = `${fontSize}px "${fontFamily}"`;
    const plainText = line.replace(/[*]|\[|\]\(#[a-fA-F0-9]{3,6}\)/g, '');
    let currentX = x;
    
    if (align === Alignment.CENTER) {
      const metrics = ctx.measureText(plainText);
      currentX = x - metrics.width / 2;
    }

    parts.forEach(part => {
      ctx.font = `${part.bold ? '700' : '400'} ${fontSize}px "${fontFamily}"`;
      ctx.fillStyle = part.color || defaultColor;
      ctx.fillText(part.text, currentX, currentY);
      currentX += ctx.measureText(part.text).width;
    });
    currentY += lineHeight;
  });
  return currentY;
};

export const renderSlideToCanvas = async (
  canvas: HTMLCanvasElement,
  slide: SlideData | null,
  totalSlides: number,
  config: DesignConfig,
  isFinal: boolean = false
): Promise<boolean> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;
  const margin = width * 0.08;

  ctx.fillStyle = config.customColor;
  ctx.fillRect(0, 0, width, height);

  if (config.bgImageUrl) {
    try {
      const img = new Image();
      img.src = config.bgImageUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      ctx.globalAlpha = 0.3;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    } catch (e) {}
  }

  if (isFinal) {
    await renderFinalSlide(ctx, width, height, margin, config);
  } else if (slide) {
    const isFirst = slide.id === 1;
    const baseSize = isFirst ? config.fontSizes.first : config.fontSizes.middle;
    const fontSize = (width / 1000) * baseSize;
    const lineHeight = fontSize * config.fontSizes.lineHeight;
    const yStart = (height * config.fontSizes.verticalOffset) / 100;

    ctx.textBaseline = 'top';
    drawWrappedRichText(
      ctx,
      slide.text,
      config.alignment === Alignment.CENTER ? width / 2 : margin,
      yStart,
      width - margin * 2,
      lineHeight,
      config.alignment,
      config.textColor,
      config.fontPair.body,
      fontSize
    );
  }

  if (!isFinal) {
    await drawBranding(ctx, width, height, margin, config);
    if (config.numbering.enabled) {
      drawNumbering(ctx, width, height, margin, `${slide?.id}/${totalSlides}`, config);
    }
  }

  return true;
};

const renderFinalSlide = async (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, config: DesignConfig) => {
  const f = config.finalSlide;
  const textColor = config.textColor;
  const bodyFont = config.fontPair.body;

  const codeY = (height * f.codeWordY) / 100;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.font = `400 ${width * 0.05}px "${bodyFont}"`;
  ctx.fillStyle = textColor;
  ctx.fillText(f.textBefore, width / 2, codeY - 140);

  ctx.font = `700 ${width * 0.09}px "${bodyFont}"`;
  const metrics = ctx.measureText(f.codeWord);
  const paddingH = 70;
  const paddingV = 40;
  const rectW = metrics.width + paddingH * 2;
  const rectH = width * 0.12 + paddingV * 2;

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(width / 2 - rectW / 2, codeY - rectH / 2, rectW, rectH, rectH / 2);
  ctx.stroke();
  ctx.fillText(f.codeWord, width / 2, codeY);

  ctx.font = `400 ${width * 0.05}px "${bodyFont}"`;
  ctx.fillText(f.textAfter, width / 2, codeY + 140);

  const avatarY = (height * f.avatarY) / 100;
  let textX = margin;

  if (config.avatarUrl) {
    const avatarImg = new Image();
    avatarImg.src = config.avatarUrl;
    await new Promise(r => { avatarImg.onload = r; avatarImg.onerror = r; });
    ctx.save();
    ctx.beginPath();
    ctx.arc(margin + 60, avatarY, 60, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, margin, avatarY - 60, 120, 120);
    ctx.restore();
    textX += 150;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${width * 0.04}px "${bodyFont}"`;
  ctx.fillText(config.nickname || 'аккаунт', textX, avatarY - 45);

  ctx.font = `400 ${width * 0.035}px "${bodyFont}"`;
  const desc = f.blogDescription || "Подписывайся!";
  const lines = wrapText(ctx, desc, width - textX - margin);
  lines.forEach((l, i) => ctx.fillText(l, textX, avatarY - 5 + i * 40));
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

const drawBranding = async (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, config: DesignConfig) => {
  let x = margin;
  let y = height - margin;
  ctx.textAlign = 'left';

  switch (config.nickPosition) {
    case NickPosition.TOP_LEFT: x = margin; y = margin + 50; break;
    case NickPosition.TOP_CENTER: x = width/2; y = margin + 50; ctx.textAlign = 'center'; break;
    case NickPosition.TOP_RIGHT: x = width - margin; y = margin + 50; ctx.textAlign = 'right'; break;
    case NickPosition.BOTTOM_LEFT: x = margin; y = height - margin; break;
    case NickPosition.BOTTOM_CENTER: x = width/2; y = height - margin; ctx.textAlign = 'center'; break;
    case NickPosition.BOTTOM_RIGHT: x = width - margin; y = height - margin; ctx.textAlign = 'right'; break;
  }

  if (config.nickname) {
    ctx.font = `600 ${width * 0.025}px "${config.fontPair.body}"`;
    ctx.fillStyle = config.textColor;
    ctx.fillText(config.nickname, x, y);
  }
};

const drawNumbering = (ctx: CanvasRenderingContext2D, width: number, height: number, margin: number, text: string, config: DesignConfig) => {
  ctx.font = `400 ${width * 0.025}px "${config.fontPair.body}"`;
  ctx.fillStyle = config.textColor;
  ctx.globalAlpha = 0.5;
  const x = width - margin;
  const y = config.numbering.position === 'top-right' ? margin + 50 : height - margin;
  ctx.textAlign = 'right';
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1.0;
};
