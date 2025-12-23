
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
  Trash2
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  SplitType, 
  AspectRatio, 
  NickPosition, 
  SlideData, 
  TemplateId, 
  DesignConfig 
} from './types.ts';
import { renderSlideToCanvas, saveBlob } from './utils/canvasUtils.ts';

const TEMPLATES = [
  { id: TemplateId.WHITE_MINIMAL, name: 'Белый минимализм', bg: 'bg-white', text: 'text-black' },
  { id: TemplateId.BLACK_MINIMAL, name: 'Черный минимализм', bg: 'bg-zinc-900', text: 'text-white' },
  { id: TemplateId.PASTEL, name: 'Пастельный фон', bg: 'bg-rose-100', text: 'text-zinc-800' },
  { id: TemplateId.GRADIENT, name: 'Мягкий градиент', bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', text: 'text-white' },
  { id: TemplateId.NOTES, name: 'Заметки', bg: 'bg-yellow-50', text: 'text-zinc-900' },
  { id: TemplateId.CARD, name: 'Карточка на фоне', bg: 'bg-zinc-800', text: 'text-white' },
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EMPTY_LINE);
  const [nickname, setNickname] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [config, setConfig] = useState<DesignConfig>({
    templateId: TemplateId.WHITE_MINIMAL,
    aspectRatio: AspectRatio.PORTRAIT,
    nickname: '',
    avatarUrl: null,
    nickPosition: NickPosition.BOTTOM_LEFT,
    showPageNumber: true,
  });

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<number[]>([]);

  useEffect(() => {
    setConfig(prev => ({ ...prev, nickname, avatarUrl: avatar }));
  }, [nickname, avatar]);

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
    setValidationErrors([]);
  }, [inputText, splitType]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAll = async () => {
    if (slides.length === 0) return;
    setIsGenerating(true);
    const zip = new JSZip();
    const errors: number[] = [];

    for (const slide of slides) {
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

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveBlob(content, 'carousel_by_morozov.zip');
    } catch (e) {
      console.error("ZIP generation failed", e);
    } finally {
      setIsGenerating(false);
    }
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
      <header className="p-6 border-b border-zinc-800 flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tighter uppercase mb-1">Акселератор</h1>
        <p className="text-zinc-500 text-sm font-medium tracking-widest">by morozov</p>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Type size={18} />
              <h2 className="text-lg font-semibold text-white">Вставьте текст</h2>
            </div>
            <div className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Напишите ваш текст...`}
                className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
              <div className="flex gap-2">
                <select 
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as SplitType)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={SplitType.EMPTY_LINE}>Пустая строка</option>
                  <option value={SplitType.DASHES}>---</option>
                  <option value={SplitType.SLIDE_N}>Слайд N:</option>
                </select>
                <button 
                  onClick={parseSlides}
                  className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Создать слайды
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Settings size={18} />
              <h2 className="text-lg font-semibold text-white">Настройки дизайна</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Формат</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.PORTRAIT }))}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${config.aspectRatio === AspectRatio.PORTRAIT ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
                  >
                    4:5
                  </button>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.SQUARE }))}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-all ${config.aspectRatio === AspectRatio.SQUARE ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
                  >
                    1:1
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Никнейм</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="@your_nickname"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Шаблон</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setConfig(prev => ({ ...prev, templateId: t.id }))}
                    className={`p-3 rounded-lg border text-left transition-all ${config.templateId === t.id ? 'border-indigo-500 bg-zinc-800' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
                  >
                    <div className={`w-full h-4 rounded mb-2 ${t.bg}`} />
                    <span className="text-xs font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <button 
            disabled={isGenerating || slides.length === 0}
            onClick={generateAll}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Download size={20} />}
            {isGenerating ? 'Генерация...' : 'Скачать все слайды (ZIP)'}
          </button>
        </div>

        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Layout size={18} />
              <h2 className="text-lg font-semibold text-white">Превью ({slides.length})</h2>
            </div>
            {error && <div className="text-rose-400 text-xs flex items-center gap-1 bg-rose-400/10 px-3 py-1.5 rounded-full border border-rose-400/20"><AlertCircle size={14} /> {error}</div>}
          </div>

          {slides.length === 0 ? (
            <div className="h-[600px] border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600">
              <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="text-sm">Слайды пока не созданы</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[800px] pr-2">
              {slides.map((slide) => (
                <div key={slide.id} className="group relative">
                  <div 
                    className={`relative rounded-2xl overflow-hidden shadow-2xl transition-transform group-hover:scale-[1.02] duration-300 ${config.aspectRatio === AspectRatio.PORTRAIT ? 'aspect-[4/5]' : 'aspect-square'} border ${validationErrors.includes(slide.id) ? 'border-rose-500' : 'border-zinc-800'}`}
                    style={{ background: TEMPLATES.find(t => t.id === config.templateId)?.bg.startsWith('bg-gradient') ? 'linear-gradient(to bottom right, #6366F1, #A855F7)' : TEMPLATES.find(t => t.id === config.templateId)?.bg.replace('bg-', '') }}
                  >
                     <div className="absolute inset-0 p-8 flex flex-col pointer-events-none">
                        <div className={`font-bold whitespace-pre-wrap ${TEMPLATES.find(t => t.id === config.templateId)?.text}`}>
                          {slide.text}
                        </div>
                        {config.showPageNumber && (
                          <div className={`absolute bottom-8 right-8 text-xs opacity-50 ${TEMPLATES.find(t => t.id === config.templateId)?.text}`}>
                            {slide.id}/{slides.length}
                          </div>
                        )}
                        {config.nickname && (
                          <div className={`absolute bottom-8 left-8 text-xs font-bold opacity-80 ${TEMPLATES.find(t => t.id === config.templateId)?.text}`}>
                            {config.nickname}
                          </div>
                        )}
                     </div>
                  </div>
                  <button 
                    onClick={() => downloadSingle(slide)}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black"
                  >
                    <Download size={16} />
                  </button>
                  {validationErrors.includes(slide.id) && (
                    <div className="mt-2 text-rose-500 text-[10px] font-bold uppercase flex items-center gap-1">
                      <AlertCircle size={10} /> Текст не влезает
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Default export is required for index.tsx
export default App;
