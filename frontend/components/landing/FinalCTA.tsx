"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

import { MarketingSessionLink } from "@/components/MarketingSessionLink";
import type { SupabasePublicConfig } from "@/lib/supabase/config";

import { useReducedMotion } from "./useReducedMotion";

export function FinalCTA(props: { supabaseConfig: SupabasePublicConfig | null }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();

  return (
    <section ref={ref} className="relative mt-20 sm:mt-28">
      <motion.div
        className="relative overflow-hidden rounded-[8px] border border-white/10 bg-[#121212] p-8 text-center sm:p-10"
        initial={reduced ? false : { opacity: 0, y: 32 }}
        animate={inView || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {!reduced ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
            transition={{ duration: 24, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 1.2px)",
              backgroundSize: "16px 16px",
            }}
          />
        ) : null}

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[8px]"
          animate={
            reduced
              ? undefined
              : {
                  boxShadow: [
                    "inset 0 0 0 1px rgba(181,0,78,0.15)",
                    "inset 0 0 0 1px rgba(181,0,78,0.35)",
                    "inset 0 0 0 1px rgba(181,0,78,0.15)",
                  ],
                }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <h2 className="relative text-2xl font-semibold text-white/95">
          Ready when the market opens
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65">
          Sign in to access the full TWIQ portal — separate routes for F&amp;O, equities, and fin
          news as we roll them out.
        </p>
        <MarketingSessionLink
          supabaseConfig={props.supabaseConfig}
          signedOutHref="/login"
          className="relative mt-6 inline-flex rounded-full bg-[#b5004e] px-6 py-2.5 text-sm font-semibold text-white transition-[background-color,box-shadow] hover:bg-[#c90058] hover:shadow-[0_0_32px_rgba(181,0,78,0.45)]"
        >
          Go to portal
        </MarketingSessionLink>
      </motion.div>
    </section>
  );
}
