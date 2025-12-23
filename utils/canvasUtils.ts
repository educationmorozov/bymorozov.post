
import { SlideData, DesignConfig, AspectRatio, Alignment, NickPosition } from '../types.ts';

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

export const renderSlideToCanvas = async (
  canvas: HTMLCanvasElement,
  slide: SlideData,
  totalSlides: number,
  config: DesignConfig
): Promise<boolean> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;

  // 1. Background
  await applyBackground(ctx, width, height, config);

  // 2. Main Content
  const margin = 100;
  const availableWidth = width - margin * 2;
  const availableHeight = height - margin * 4;

  let fontSize = width / 18;
  const minFontSize = 32;
  let success = false;

  // Rich Text Parsing Logic
  const parseRichText = (text: string) => {
    const parts: { text: string; bold: boolean; color: string | null }[] = [];
    let current = text;
    
    // Simple regex-based parsing for MVP
    // Bold: *text* -> (color)text(color)
    const regex = /(\*[^*]+\*|\([^)]+\)[^()]+\([^)]+\))/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(current)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: current.substring(lastIndex, match.index), bold: false, color: null });
      }
      let m = match[0];
      if (m.startsWith('*')) {
        parts.push({ text: m.slice(1, -1), bold: true, color: null });
      } else {
        const colorMatch = /\(([^)]+)\)([^()]+)\(([^)]+)\)/.exec(m);
        if (colorMatch) {
          parts.push({ text: colorMatch[2], bold: false, color: colorMatch[1] });
        }
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < current.length) {
      parts.push({ text: current.substring(lastIndex), bold: false, color: null });
    }
    return parts;
  };

  const drawRichText = (yStart: number, isMeasure: boolean) => {
    // FIX: CanvasTextAlign does not support 'justify'. Map to 'left'.
    // Also casting config.alignment to CanvasTextAlign as TypeScript doesn't allow direct enum-to-union assignment.
    ctx.textAlign = (config.alignment === Alignment.JUSTIFY ? 'left' : config.alignment) as CanvasTextAlign;
    let currentY = yStart;
    const lines = slide.text.split('\n');

    for (const line of lines) {
      const parts = parseRichText(line);
      // Adjust x position logic to handle JUSTIFY as LEFT for canvas purposes
      const x = (config.alignment === Alignment.LEFT || config.alignment === Alignment.JUSTIFY) ? margin : 
                config.alignment === Alignment.CENTER ? width / 2 : width - margin;

      // Handle wrapping for the line
      // For simplicity in Canvas, we measure each part
      ctx.font = `${fontSize}px "${config.fontPair.body}"`;
      if (!isMeasure) {
        ctx.fillStyle = getContrastColor(config);
        ctx.fillText(line.replace(/[*()]|(\([^)]+\))/g, ''), x, currentY); // Simple fallback for layout
      }
      currentY += fontSize * 1.5;
    }
    return currentY - yStart;
  };

  // Iterative sizing
  while (fontSize >= minFontSize) {
    const h = drawRichText(height * 0.3, true);
    if (h <= availableHeight) {
      success = true;
      break;
    }
    fontSize -= 2;
  }

  // Draw final
  drawRichText(height * 0.3, false);

  // 3. Branding (Nickname & Avatar)
  await drawBranding(ctx, width, height, config);

  // 4. Numbering
  if (config.numbering.enabled) {
    drawNumbering(ctx, width, height, `${slide.id}/${totalSlides}`, config);
  }

  return success;
};

const applyBackground = async (ctx: CanvasRenderingContext2D, width: number, height: number, config: DesignConfig) => {
  ctx.fillStyle = config.customColor || '#000';
  ctx.fillRect(0, 0, width, height);

  if (config.bgImageUrl) {
    try {
      const img = new Image();
      img.src = config.bgImageUrl;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      ctx.globalAlpha = 0.4; // Darken for readability
      ctx.drawImage(img, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    } catch (e) { console.error(e); }
  }
};

const getContrastColor = (config: DesignConfig) => {
  // Simple brightness check for the hex color or just default
  return (config.customColor === '#ffffff' || config.customColor === 'white') ? '#000' : '#fff';
};

const drawBranding = async (ctx: CanvasRenderingContext2D, width: number, height: number, config: DesignConfig) => {
  const margin = 80;
  let x = margin;
  let y = height - margin;
  ctx.textAlign = 'left';

  switch (config.nickPosition) {
    case NickPosition.BOTTOM_RIGHT: x = width - margin; ctx.textAlign = 'right'; break;
    case NickPosition.TOP_RIGHT: x = width - margin; y = margin + 40; ctx.textAlign = 'right'; break;
    case NickPosition.TOP_CENTER: x = width / 2; y = margin + 40; ctx.textAlign = 'center'; break;
    case NickPosition.TOP_LEFT: x = margin; y = margin + 40; ctx.textAlign = 'left'; break;
  }

  if (config.avatarUrl) {
    const avatarImg = new Image();
    avatarImg.src = config.avatarUrl;
    await new Promise(r => { avatarImg.onload = r; avatarImg.onerror = r; });
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + (ctx.textAlign === 'right' ? -30 : 30), y - 15, 25, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, x + (ctx.textAlign === 'right' ? -55 : 5), y - 40, 50, 50);
    ctx.restore();
    x += (ctx.textAlign === 'right' ? -70 : 70);
  }

  if (config.nickname) {
    ctx.font = `600 24px "${config.fontPair.body}"`;
    ctx.fillStyle = getContrastColor(config);
    ctx.fillText(config.nickname, x, y);
  }
};

const drawNumbering = (ctx: CanvasRenderingContext2D, width: number, height: number, text: string, config: DesignConfig) => {
  ctx.font = `400 24px "${config.fontPair.body}"`;
  ctx.fillStyle = getContrastColor(config);
  ctx.globalAlpha = 0.6;
  const margin = 80;
  if (config.numbering.position === 'top-right') {
    ctx.textAlign = 'right';
    ctx.fillText(text, width - margin, margin + 40);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(text, width - margin, height - margin);
  }
  ctx.globalAlpha = 1.0;
};
