import { useState } from 'react';
import { X } from 'lucide-react';
import { ASSETS } from '../data/demoSeed';
import { SafeImage } from '../components/SafeImage';

const GALLERY_ITEMS = [
  {
    src: ASSETS.heroFallback,
    title: 'Copper Handi Dum Biryani',
    caption: 'Slow-cooked saffron basmati rice garnished with crisp birista and mint',
  },
  {
    src: ASSETS.interior,
    title: 'The Obsidian Dining Room',
    caption: 'Candlelit black marble tables framed by brushed brass architectural screens',
  },
  {
    src: ASSETS.chickenBiryani,
    title: 'Royal Hyderabadi Chicken Biryani',
    caption: 'Aged basmati layered with spiced chicken and served with burhani raita',
  },
  {
    src: ASSETS.muttonBiryani,
    title: 'Nizami Mutton Dum Biryani',
    caption: 'Tender slow-braised goat finished with toasted cashews and saffron',
  },
  {
    src: ASSETS.vegBiryani,
    title: 'Subz & Charred Paneer Biryani',
    caption: 'Tandoor-seared malai paneer, seasonal greens, and dried damask rose petals',
  },
  {
    src: ASSETS.starters,
    title: 'Charcoal Tandoor Skewers',
    caption: 'Kashmiri chili chicken tikka and hand-minced seekh kebabs with mint chutney',
  },
  {
    src: ASSETS.mainCourse,
    title: 'Velvet Makhani & Black Dal',
    caption: '24-hour simmered black lentils alongside blistered garlic butter naan',
  },
  {
    src: ASSETS.desserts,
    title: 'Royal Shahi Tukda',
    caption: 'Saffron rabri, crushed Iranian pistachios, rose petals, and silver leaf',
  },
  {
    src: ASSETS.beverages,
    title: 'Saffron Lassi & Smoked Chai',
    caption: 'Cut-crystal saffron lassi and whole-spice masala chai in hammered brass',
  },
];

export function Gallery() {
  const [selected, setSelected] = useState<(typeof GALLERY_ITEMS)[number] | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Culinary & Architectural Showcase
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Food & Dining Gallery
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {GALLERY_ITEMS.map((entry) => (
          <button
            key={entry.title}
            type="button"
            onClick={() => setSelected(entry)}
            className="group text-left bg-[#121212] border border-white/10 hover:border-[#C9A45C]/60 transition-colors overflow-hidden"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#1C1C1C]">
              <SafeImage
                src={entry.src}
                alt={entry.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-5">
              <h2 className="font-display text-lg text-white group-hover:text-[#E6CC91] transition-colors">
                {entry.title}
              </h2>
              <p className="text-xs text-[#B8B8B8] mt-1">{entry.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="max-w-4xl w-full bg-[#121212] border border-[#C9A45C]/40 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h2 className="font-display text-lg text-white">{selected.title}</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close image preview"
                className="p-1.5 text-[#B8B8B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SafeImage
              src={selected.src}
              alt={selected.title}
              eager
              className="w-full max-h-[70vh] object-contain bg-[#090909]"
            />
            <p className="px-5 py-4 text-sm text-[#B8B8B8]">{selected.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}
