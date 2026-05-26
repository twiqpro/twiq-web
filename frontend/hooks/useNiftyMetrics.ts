"use client";

import { useEffect, useState } from "react";

import { fetchNiftyMetrics } from "@/lib/api";
import { config } from "@/lib/config";
import type { MetricsWsMessage, NiftyMetrics } from "@/lib/metricsTypes";

export function useNiftyMetrics(expiry?: string) {
  const [metrics, setMetrics] = useState<NiftyMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchNiftyMetrics(expiry)
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load metrics");
        }
      });

    const wsUrl = new URL(config.wsUrl);
    wsUrl.pathname = "/ws/metrics";
    if (expiry) wsUrl.searchParams.set("expiry", expiry);

    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError((prev) => prev ?? "Metrics WebSocket error");

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as MetricsWsMessage;
        if (msg.type === "error") {
          setError(msg.message);
          return;
        }
        if (msg.type === "metrics_snapshot" || msg.type === "metrics_update") {
          setMetrics(msg.metrics);
          setError(null);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [expiry]);

  return { metrics, error, connected };
}
