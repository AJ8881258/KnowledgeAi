import { type MouseEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carouselSlides } from "./login-carousel-data";

const AUTO_SLIDE_DELAY_MS = 3600;
const RECENT_AUTO_ADVANCE_MS = 700;

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-lg font-bold text-white shadow-[0_8px_22px_rgba(37,99,235,0.25)]">
        KF
      </div>
      <span className="font-semibold text-slate-950">KnowFlow AI</span>
    </div>
  );
}

export function LoginVisualCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoResetKey, setAutoResetKey] = useState(0);
  const timerRef = useRef<number | null>(null);
  const timerGenerationRef = useRef(0);
  const lastAutoAdvanceAtRef = useRef(0);

  const clearAutoAdvance = useCallback(() => {
    timerGenerationRef.current += 1;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const generation = timerGenerationRef.current + 1;
    timerGenerationRef.current = generation;

    timerRef.current = window.setTimeout(() => {
      if (timerGenerationRef.current !== generation) {
        return;
      }

      timerRef.current = null;
      lastAutoAdvanceAtRef.current = Date.now();
      setActiveSlide((current) => (current + 1) % carouselSlides.length);
    }, AUTO_SLIDE_DELAY_MS);

    return clearAutoAdvance;
  }, [activeSlide, autoResetKey, clearAutoAdvance]);

  const goToSlide = useCallback(
    (
      nextSlide: number | ((current: number) => number),
      options: { coalesceRecentAuto?: boolean } = {},
    ) => {
      clearAutoAdvance();

      if (
        options.coalesceRecentAuto &&
        Date.now() - lastAutoAdvanceAtRef.current < RECENT_AUTO_ADVANCE_MS
      ) {
        setAutoResetKey((current) => current + 1);
        return;
      }

      setActiveSlide((current) => {
        const resolvedSlide =
          typeof nextSlide === "function" ? nextSlide(current) : nextSlide;

        return (resolvedSlide + carouselSlides.length) % carouselSlides.length;
      });
      setAutoResetKey((current) => current + 1);
    },
    [clearAutoAdvance],
  );

  const showPreviousSlide = () => {
    goToSlide((current) => current - 1);
  };

  const showNextSlide = () => {
    goToSlide((current) => current + 1, { coalesceRecentAuto: true });
  };

  const handlePreviousPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 0) {
      showPreviousSlide();
    }
  };

  const handleNextPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 0) {
      showNextSlide();
    }
  };

  const handlePreviousClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      showPreviousSlide();
    }
  };

  const handleNextClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      showNextSlide();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="relative w-full max-w-[940px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <div className="relative aspect-[16/10] bg-slate-50">
            {carouselSlides.map((slide, index) => (
              <img
                key={slide.label}
                src={slide.image}
                alt={slide.alt}
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
                  activeSlide === index ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          aria-label="上一张截图"
          onPointerDown={handlePreviousPointerDown}
          onClick={handlePreviousClick}
          className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-slate-200 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="下一张截图"
          onPointerDown={handleNextPointerDown}
          onClick={handleNextClick}
          className="absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-slate-200 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur hover:bg-white"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="mt-5 flex items-center justify-center gap-2">
          {carouselSlides.map((slide, index) => (
            <button
              key={slide.label}
              type="button"
              aria-label={`切换到${slide.label}截图`}
              onPointerDown={clearAutoAdvance}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                activeSlide === index
                  ? "w-8 bg-blue-600"
                  : "w-2.5 bg-slate-300",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
