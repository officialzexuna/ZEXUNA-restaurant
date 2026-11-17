import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { ASSETS } from '../data/demoSeed';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';

export function HeroVideo() {
  const { settings } = useRestaurant();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const videoSrc = settings.heroVideoUrl || '/assets/hero-biryani.mp4';
  const waHref = buildGeneralWhatsAppEnquiryUrl(
    settings.whatsappNumber,
    'Hello ZEXUNA Restaurant! I would like to explore your menu and place an order.'
  );

  function togglePlay() {
    const el = videoRef.current;
    if (!el || !videoAvailable) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const el = videoRef.current;
    if (!el || !videoAvailable) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  return (
    <section className="relative min-h-[82vh] flex items-center overflow-hidden bg-[#090909] border-b border-[#C9A45C]/20">
      {/* Background Media Layer */}
      <div className="absolute inset-0">
        {videoAvailable ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={ASSETS.heroFallback}
            onError={() => setVideoAvailable(false)}
          >
            <source src={videoSrc} type="video/mp4" onError={() => setVideoAvailable(false)} />
          </video>
        ) : (
          <img
            src={ASSETS.heroFallback}
            alt="Steaming royal saffron dum biryani served in a hammered copper handi at ZEXUNA Restaurant"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105 transition-transform duration-1000"
          />
        )}
        {/* Measured scrim ensuring >= 4.5:1 text contrast */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#090909]/92 via-[#090909]/70 to-[#090909]/35"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-[#090909]/40"
          aria-hidden="true"
        />
      </div>

      {/* Foreground Editorial Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={ASSETS.logo}
              alt="ZEXUNA Crest"
              className="w-11 h-11 object-contain"
            />
            <p className="text-xs tracking-[0.22em] uppercase text-[#E6CC91]">
              ZEXUNA Restaurant · Technology Without Limits.
            </p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1] mb-6">
            WHERE FLAVOUR MEETS PERFECTION
          </h1>

          <p className="text-base sm:text-lg text-[#E6CC91]/90 leading-relaxed max-w-xl mb-10">
            Discover the extraordinary world of authentic biryani, rich flavours and unforgettable dining experiences.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/menu"
              className="px-7 py-3.5 bg-[#C9A45C] text-[#090909] text-sm font-semibold tracking-wider uppercase hover:bg-[#E6CC91] transition-colors whitespace-nowrap"
            >
              Explore Menu
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 bg-[#121212]/90 border border-[#C9A45C]/60 text-[#E6CC91] text-sm font-medium tracking-wide hover:bg-[#1C1C1C] transition-colors whitespace-nowrap"
            >
              Order on WhatsApp
            </a>
            <Link
              to="/reservations"
              className="px-6 py-3.5 border border-white/25 text-white text-sm font-medium tracking-wide hover:border-[#C9A45C] hover:text-[#E6CC91] transition-colors whitespace-nowrap"
            >
              Reserve a Table
            </Link>
          </div>
        </div>
      </div>

      {/* Accessible Video / Media Status Controls */}
      <div className="absolute bottom-6 right-4 sm:right-8 z-10 flex items-center gap-2">
        {videoAvailable ? (
          <>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause background video' : 'Play background video'}
              className="p-2.5 bg-[#121212]/85 border border-[#C9A45C]/40 text-[#E6CC91] hover:bg-[#1C1C1C]"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute background video' : 'Mute background video'}
              className="p-2.5 bg-[#121212]/85 border border-[#C9A45C]/40 text-[#E6CC91] hover:bg-[#1C1C1C]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          <span className="px-3 py-1.5 bg-[#121212]/85 border border-white/15 text-[11px] text-[#B8B8B8]">
            Photographic backdrop · Upload MP4 in Admin Settings for video
          </span>
        )}
      </div>
    </section>
  );
}
