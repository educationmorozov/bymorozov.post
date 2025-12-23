
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Type, 
  Settings, 
  Image as ImageIcon, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Layout,
  User,
  Plus,
  Trash2,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  SplitType, 
  AspectRatio, 
  NickPosition, 
  SlideData, 
  TemplateId, 
  DesignConfig 
} from './types';
import { renderSlideToCanvas, saveBlob } from './utils/canvasUtils';

// Template Preview Cards
const TEMPLATES = [
  { id: TemplateId.WHITE_MINIMAL, name: 'Белый минимализм', bg: 'bg-white', text: 'text-black' },
  { id: TemplateId.BLACK_MINIMAL, name: 'Черный минимализм', bg: 'bg-zinc-900', text: 'text-white' },
  { id: TemplateId.PASTEL, name: 'Пастельный фон', bg: 'bg-rose-100', text: 'text-zinc-800' },
  { id: TemplateId.GRADIENT, name: 'Мягкий градиент', bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', text: 'text-white' },
  { id: TemplateId.NOTES, name: 'Заметки', bg: 'bg-yellow-50', text: 'text-zinc-900' },
  { id: TemplateId.CARD, name: 'Карточка на фоне', bg: 'bg-zinc-800', text: 'text-white' },
];

const App: React.FC = () => {
  // Input State
  const [inputText, setInputText] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EMPTY_LINE);
  const [nickname, setNickname] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Design State
  const [config, setConfig] = useState<DesignConfig>({
    templateId: TemplateId.WHITE_MINIMAL,
    aspectRatio: AspectRatio.PORTRAIT,
    nickname: '',
    avatarUrl: null,
    nickPosition: NickPosition.BOTTOM_LEFT,
    showPageNumber: true,
  });

  // Generated State
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<number[]>([]);
  const [previewScale, setPreviewScale] = useState(0.25);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update config when local state changes
  useEffect(() => {
    setConfig(prev => ({ ...prev, nickname, avatarUrl: avatar }));
  }, [nickname, avatar]);

  // Parsing Logic
  const parseSlides = useCallback(() => {
    if (!inputText.trim()) {
      setSlides([]);
      return;
    }

    let rawSlides: string[] = [];
    if (splitType === SplitType.EMPTY_LINE) {
      rawSlides = inputText.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
    } else if (splitType === SplitType.DASHES) {
      rawSlides = inputText.split(/---/).map(s => s.trim()).filter(s => s.length > 0);
    } else if (splitType === SplitType.SLIDE_N) {
      rawSlides = inputText.split(/Слайд \d+:|Слайд \d+/i).map(s => s.trim()).filter(s => s.length > 0);
    }

    if (rawSlides.length > 20) {
      setError('Слайдов больше 20. Будут использованы только первые 20.');
      rawSlides = rawSlides.slice(0, 20);
    } else {
      setError(null);
    }

    const newSlides = rawSlides.map((text, index) => ({
      id: index + 1,
      text,
    }));
    setSlides(newSlides);
    setValidationErrors([]); // Reset on parse
  }, [inputText, splitType]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const generateAll = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    const errors: number[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const canvas = document.createElement('canvas');
      const [width, height] = config.aspectRatio.split('x').map(Number);
      canvas.width = width;
      canvas.height = height;
      
      const success = await renderSlideToCanvas(canvas, slide, slides.length, config);
      if (!success) {
        errors.push(slide.id);
      } else {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          zip.file(`carousel_${String(slide.id).padStart(2, '0')}.png`, blob);
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsGenerating(false);
      return;
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveBlob(content, 'carousel_by_morozov.zip');
    setIsGenerating(false);
  };

  const downloadSingle = async (slide: SlideData) => {
    const canvas = document.createElement('canvas');
    const [width, height] = config.aspectRatio.split('x').map(Number);
    canvas.width = width;
    canvas.height = height;
    
    await renderSlideToCanvas(canvas, slide, slides.length, config);
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, `carousel_${String(slide.id).padStart(2, '0')}.png`);
    }, 'image/png');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-zinc-800 flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tighter uppercase mb-1">Акселератор</h1>
        <p className="text-zinc-500 text-sm font-medium tracking-widest">by morozov</p>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Editor & Settings */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Section 1: Text Input */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Type size={18} />
              <h2 className="text-lg font-semibold text-white">Вставьте текст</h2>
            </div>
            
            <div className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Напишите текст для карусели...\n\nКаждый слайд отделяйте пустой строкой.\n\nМаксимум 20 слайдов.`}
                className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
              />
              
              <div className="flex flex-wrap gap-2">
                <select 
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as SplitType)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none"
                >
                  <option value={SplitType.EMPTY_LINE}>Разделитель: Пустая строка</option>
                  <option value={SplitType.DASHES}>Разделитель: ---</option>
                  <option value={SplitType.SLIDE_N}>Разделитель: Слайд N:</option>
                </select>
                <button 
                  onClick={parseSlides}
                  className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-tight"
                >
                  Проверить разметку
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Account Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <User size={18} />
              <h2 className="text-lg font-semibold text-white">Аккаунт</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Никнейм</label>
                <input 
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="@username"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Аватарка</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 text-xs flex items-center justify-center cursor-pointer transition-colors group">
                    {avatar ? <CheckCircle size={14} className="text-green-500 mr-2" /> : <Plus size={14} className="text-zinc-500 mr-2 group-hover:text-white" />}
                    {avatar ? 'Загружено' : 'Выбрать фото'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                  {avatar && (
                    <button onClick={() => setAvatar(null)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Design Config */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Settings size={18} />
              <h2 className="text-lg font-semibold text-white">Настройки дизайна</h2>
            </div>

            <div className="space-y-6">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Формат Instagram</label>
                <div className="flex gap-2">
                  {[AspectRatio.PORTRAIT, AspectRatio.SQUARE].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                        config.aspectRatio === ratio 
                          ? 'bg-white text-black border-white' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {ratio === AspectRatio.PORTRAIT ? '1080×1350 (4:5)' : '1080×1080 (1:1)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nick Position */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Позиция ника</label>
                <div className="grid grid-cols-3 gap-2">
                  {[NickPosition.BOTTOM_LEFT, NickPosition.BOTTOM_RIGHT, NickPosition.TOP_RIGHT].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setConfig(prev => ({ ...prev, nickPosition: pos }))}
                      className={`py-2 rounded-lg text-[10px] font-medium transition-all border ${
                        config.nickPosition === pos 
                          ? 'bg-white text-black border-white' 
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {pos === NickPosition.BOTTOM_LEFT && 'Снизу слева'}
                      {pos === NickPosition.BOTTOM_RIGHT && 'Снизу справа'}
                      {pos === NickPosition.TOP_RIGHT && 'Сверху справа'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Выберите дизайн</label>
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setConfig(prev => ({ ...prev, templateId: t.id }))}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all p-2 flex items-center justify-center ${
                        config.templateId === t.id 
                          ? 'border-white scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                          : 'border-zinc-800 grayscale hover:grayscale-0 hover:border-zinc-600'
                      } ${t.bg}`}
                    >
                      <span className={`text-[10px] font-bold ${t.text} truncate px-2`}>{t.name}</span>
                      {config.templateId === t.id && (
                        <div className="absolute top-1 right-1 bg-white text-black rounded-full p-0.5">
                          <CheckCircle size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Preview Grid */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="sticky top-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-400">
                <Layout size={18} />
                <h2 className="text-lg font-semibold text-white">Предпросмотр</h2>
              </div>
              <div className="flex items-center gap-3">
                 {slides.length > 0 && (
                   <span className="text-xs text-zinc-500 font-mono">{slides.length} слайдов</span>
                 )}
              </div>
            </div>

            {/* Notifications */}
            {error && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded-lg flex items-start gap-3 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg flex items-start gap-3 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <p>
                  Текст на слайдах {validationErrors.join(', ')} не помещается в дизайн. Сократите текст.
                </p>
              </div>
            )}

            {/* Preview Scroll Area */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl min-h-[500px] overflow-y-auto p-6 flex flex-col items-center gap-8 relative custom-scrollbar">
              {slides.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-zinc-600 h-full gap-4 mt-32">
                  <ImageIcon size={48} strokeWidth={1} />
                  <p className="text-sm">Тут появится превью ваших слайдов</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {slides.map((slide) => (
                    <SlidePreview 
                      key={slide.id} 
                      slide={slide} 
                      totalSlides={slides.length} 
                      config={config} 
                      hasError={validationErrors.includes(slide.id)}
                      onDownload={() => downloadSingle(slide)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                disabled={slides.length === 0 || isGenerating}
                onClick={generateAll}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                  slides.length === 0 || isGenerating
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-zinc-200 shadow-xl'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Генерация...
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} />
                    Сгенерировать и скачать ZIP
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-medium">
                Генерация происходит в вашем браузере. Мы не храним ваши данные.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 border-t border-zinc-900 mt-12 text-center text-zinc-700">
        <p className="text-xs">© 2024 Акселератор. Все права защищены. Создано для Instagram.</p>
      </footer>
    </div>
  );
};

// Component for Individual Slide Preview
interface SlidePreviewProps {
  slide: SlideData;
  totalSlides: number;
  config: DesignConfig;
  hasError: boolean;
  onDownload: () => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, totalSlides, config, hasError, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderSlideToCanvas(canvasRef.current, slide, totalSlides, config);
    }
  }, [slide, totalSlides, config]);

  const [width, height] = config.aspectRatio.split('x').map(Number);

  return (
    <div className={`relative group transition-all duration-300 ${hasError ? 'ring-2 ring-red-500 scale-[0.98]' : 'hover:scale-[1.02]'}`}>
      <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-white/80">
        #{slide.id}
      </div>
      
      {/* Aspect Ratio Container */}
      <div 
        className="w-full bg-zinc-900 rounded-lg overflow-hidden shadow-2xl relative"
        style={{ aspectRatio: width / height }}
      >
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="w-full h-full object-contain"
        />

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            onClick={onDownload}
            className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
            title="Скачать PNG"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {hasError && (
        <div className="absolute -bottom-2 left-0 right-0 text-center">
          <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
            Текст не помещается
          </span>
        </div>
      )}
    </div>
  );
};

export default App;
