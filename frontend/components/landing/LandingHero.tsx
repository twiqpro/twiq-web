"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

import { MarketingSessionLink } from "@/components/MarketingSessionLink";
import { TwiqLogo } from "@/components/TwiqLogo";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

import { primaryCtaClass } from "./brand";
import { HeroShaderBackdrop } from "./HeroShaderBackdrop";
import { useReducedMotion } from "./useReducedMotion";

const headlineLines = ["Quant-grade Nifty structure.", "AI clarity, not noise."];

const fadeUp = (delay: number, reduced: boolean) =>
  reduced
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
      };

export function LandingHero(props: { supabaseConfig: SupabasePublicConfig | null }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const shimmerOpacity = useTransform(scrollYProgress, [0, 0.65, 0.92], [0.3, 0.3, 0]);
  const shimmerVisible = useTransform(scrollYProgress, (v) => (v >= 0.95 ? "hidden" : "visible"));

  useMotionValueEvent(progress, "change", (v) => {
    setScrollProgress(v);
  });

  const heroLift = reduced ? 0 : scrollProgress * -48;
  const heroScale = reduced ? 1 : 1 - scrollProgress * 0.04;
  const heroOpacity = reduced ? 1 : 1 - scrollProgress * 0.35;

  return (
    <section ref={sectionRef} className="relative grid w-full">
      {!reduced ? (
        <motion.div
          className="pointer-events-none sticky top-0 col-start-1 row-start-1 z-0 h-[100svh] w-full self-start overflow-hidden"
          style={{ opacity: shimmerOpacity, visibility: shimmerVisible }}
          aria-hidden
        >
          <HeroShaderBackdrop />
        </motion.div>
      ) : null}

      <div className="relative z-10 col-start-1 row-start-1 mx-auto min-h-[100svh] w-full max-w-[1100px] px-4 pb-10 pt-2 sm:px-6 lg:pb-12">
        <motion.header
          className="flex items-center justify-between"
          {...fadeUp(0, reduced)}
        >
          <TwiqLogo />
          <MarketingSessionLink
            supabaseConfig={props.supabaseConfig}
            signedOutHref="/login"
            className={primaryCtaClass}
          >
            Login
          </MarketingSessionLink>
        </motion.header>

        <motion.div
          className="mt-10 max-w-3xl pt-[138px] lg:mt-14"
          style={{
            y: heroLift,
            scale: heroScale,
            opacity: heroOpacity,
            transformOrigin: "top center",
          }}
        >
          <motion.p
            className="mb-4 inline-flex rounded-full border border-[#b5004e]/40 bg-[#b5004e]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#f472b6]"
            {...fadeUp(0.12, reduced)}
          >
            Pro Insights for Retail Traders
          </motion.p>

          <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-white/95 sm:text-5xl lg:text-[3.25rem]">
            {headlineLines.map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={reduced ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: reduced ? 0 : 0.22 + i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8"
            {...fadeUp(0.48, reduced)}
          >
            TWIQ is your options intelligence portal — realtime charts, OI context, and
            AI-assisted reads designed for F&amp;O desks that move fast.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <MarketingSessionLink
              supabaseConfig={props.supabaseConfig}
              signedOutHref="/login"
              className="rounded-full bg-[#b5004e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c90058] hover:shadow-[0_0_28px_rgba(181,0,78,0.4)]"
            >
              Login
            </MarketingSessionLink>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
