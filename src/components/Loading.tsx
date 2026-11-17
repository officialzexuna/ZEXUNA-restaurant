import { ASSETS } from '../data/demoSeed';

export function LoadingScreen({ label = 'Preparing your dining experience' }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-20 bg-[#090909]">
      <img
        src={ASSETS.logo}
        alt="ZEXUNA Restaurant"
        className="w-20 h-20 object-contain mb-6 opacity-95"
      />
      <p className="font-display text-lg text-[#E6CC91] tracking-wide mb-2">ZEXUNA</p>
      <p className="text-sm text-[#B8B8B8]">{label}</p>
    </div>
  );
}

export function MenuSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[#121212] border border-white/10 overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-[#1C1C1C]" />
          <div className="p-6 space-y-3">
            <div className="h-3 w-28 bg-[#1C1C1C]" />
            <div className="h-5 w-3/4 bg-[#1C1C1C]" />
            <div className="h-4 w-full bg-[#1C1C1C]" />
            <div className="h-9 w-full bg-[#1C1C1C] mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
