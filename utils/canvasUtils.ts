
import { SlideData, DesignConfig, TemplateId, NickPosition, AspectRatio } from '../types';

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

  // Clear Canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Background
  applyBackground(ctx, width, height, config.templateId);

  // 2. Draw Text (Main logic)
  const margin = 100;
  const availableWidth = width - margin * 2;
  const availableHeight = height - margin * 3; // Extra margin for footer

  const lines = slide.text.split('\n');
  const hasTitle = lines.length > 1 && lines[0].length < 40;
  
  let fontSize = config.aspectRatio === AspectRatio.PORTRAIT ? 64 : 56;
  const minFontSize = config.aspectRatio === AspectRatio.PORTRAIT ? 36 : 30;
  let success = false;

  while (fontSize >= minFontSize) {
    ctx.font = `${fontSize}px 'Inter', sans-serif`;
    const textHeight = wrapText(ctx, slide.text, margin, height * 0.3, availableWidth, fontSize * 1.4, availableHeight, true);
    
    if (textHeight <= availableHeight) {
      success = true;
      break;
    }
    fontSize -= 4;
  }

  // Final Draw
  ctx.font = `${fontSize}px 'Inter', sans-serif`;
  applyTextColor(ctx, config.templateId);
  wrapText(ctx, slide.text, margin, height * 0.3, availableWidth, fontSize * 1.4, availableHeight, false);

  // 3. Page Number
  if (config.showPageNumber) {
    ctx.font = `300 32px 'Inter', sans-serif`;
    ctx.globalAlpha = 0.5;
    const pageStr = `${slide.id}/${totalSlides}`;
    drawPageNumber(ctx, width, height, pageStr, config.templateId);
    ctx.globalAlpha = 1.0;
  }

  // 4. Nickname & Avatar
  if (config.nickname || config.avatarUrl) {
    await drawUserFooter(ctx, width, height, config);
  }

  return success;
};

const applyBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, template: TemplateId) => {
  switch (template) {
    case TemplateId.WHITE_MINIMAL:
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      break;
    case TemplateId.BLACK_MINIMAL:
      ctx.fillStyle = '#0F0F0F';
      ctx.fillRect(0, 0, width, height);
      // Subtle accent
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.1;
      ctx.fillRect(width * 0.1, height * 0.1, 1, height * 0.1);
      ctx.globalAlpha = 1.0;
      break;
    case TemplateId.PASTEL:
      ctx.fillStyle = '#FCE4EC'; // Rose pastel
      ctx.fillRect(0, 0, width, height);
      break;
    case TemplateId.GRADIENT:
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#6366F1');
      grad.addColorStop(1, '#A855F7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    case TemplateId.NOTES:
      ctx.fillStyle = '#FFFDE7';
      ctx.fillRect(0, 0, width, height);
      // Paper lines
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 1;
      for (let i = 1; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, height * 0.08 * i);
        ctx.lineTo(width, height * 0.08 * i);
        ctx.stroke();
      }
      break;
    case TemplateId.CARD:
      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 40;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      const cardMargin = 80;
      ctx.roundRect(cardMargin, cardMargin, width - cardMargin*2, height - cardMargin*2, 24);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
  }
};

const applyTextColor = (ctx: CanvasRenderingContext2D, template: TemplateId) => {
  switch (template) {
    case TemplateId.WHITE_MINIMAL:
    case TemplateId.NOTES:
      ctx.fillStyle = '#000000';
      break;
    case TemplateId.BLACK_MINIMAL:
    case TemplateId.GRADIENT:
      ctx.fillStyle = '#FFFFFF';
      break;
    case TemplateId.PASTEL:
      ctx.fillStyle = '#2D3748';
      break;
    case TemplateId.CARD:
      ctx.fillStyle = '#18181B';
      break;
  }
};

const wrapText = (
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number,
  maxHeight: number,
  measureOnly: boolean
): number => {
  const paragraphs = text.split('\n');
  let currentY = y;

  for (let i = 0; i < paragraphs.length; i++) {
    const words = paragraphs[i].split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        if (!measureOnly) ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (!measureOnly) ctx.fillText(line, x, currentY);
    currentY += lineHeight * 1.2; // Paragraph spacing
  }

  return currentY - y;
};

const drawPageNumber = (ctx: CanvasRenderingContext2D, width: number, height: number, text: string, template: TemplateId) => {
  const margin = 80;
  if (template === TemplateId.PASTEL) {
    ctx.fillText(text, width - margin - 80, margin + 40); // Top right
  } else if (template === TemplateId.BLACK_MINIMAL) {
    ctx.fillText(text, margin, height - margin); // Bottom left
  } else {
    ctx.fillText(text, width - margin - 60, height - margin); // Default bottom right
  }
};

const drawUserFooter = async (ctx: CanvasRenderingContext2D, width: number, height: number, config: DesignConfig) => {
  const margin = 100;
  let x = margin;
  let y = height - margin;
  const avatarSize = 60;

  if (config.nickPosition === NickPosition.BOTTOM_RIGHT) {
    x = width - margin;
    ctx.textAlign = 'right';
  } else if (config.nickPosition === NickPosition.TOP_RIGHT) {
    x = width - margin;
    y = margin + 40;
    ctx.textAlign = 'right';
  } else {
    ctx.textAlign = 'left';
  }

  // Draw Avatar
  if (config.avatarUrl) {
    try {
      const img = new Image();
      img.src = config.avatarUrl;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      
      ctx.save();
      ctx.beginPath();
      const imgX = config.nickPosition === NickPosition.BOTTOM_LEFT ? x : x - avatarSize;
      const imgY = y - avatarSize / 1.5;
      ctx.arc(imgX + avatarSize / 2, imgY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, avatarSize, avatarSize);
      ctx.restore();
      
      // Shift text to not overlap avatar
      if (config.nickPosition === NickPosition.BOTTOM_LEFT) x += avatarSize + 20;
      else x -= avatarSize + 20;
    } catch (e) {
      console.error("Avatar failed to load");
    }
  }

  // Draw Nickname
  ctx.font = `600 28px 'Inter', sans-serif`;
  applyTextColor(ctx, config.templateId);
  ctx.globalAlpha = 0.8;
  if (config.nickname) {
    ctx.fillText(config.nickname, x, y);
  }
  ctx.globalAlpha = 1.0;
  ctx.textAlign = 'left'; // Reset
};
