"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "./useReducedMotion";

type ThreeModule = typeof import("three");

type SceneState = {
  renderer: import("three").WebGLRenderer | null;
  animationId: number | null;
  resizeObserver: ResizeObserver | null;
  onWindowResize: (() => void) | null;
  uniforms: { intensity: { value: number } } | null;
};

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  #define TWO_PI 6.2831853072
  #define PI 3.14159265359

  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform float intensity;

  float random(in float x) {
    return fract(sin(x) * 1e4);
  }

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main(void) {
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

    vec2 fMosaicScal = vec2(4.0, 2.0);
    vec2 vScreenSize = vec2(256.0, 256.0);
    uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
    uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

    float t = time * 0.06 + random(uv.x) * 0.4;
    float lineWidth = 0.0008;

    vec3 color = vec3(0.0);
    for (int j = 0; j < 3; j++) {
      for (int i = 0; i < 5; i++) {
        color[j] += lineWidth * float(i * i) / abs(
          fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv)
        );
      }
    }

    color *= intensity;
    gl_FragColor = vec4(color[2], color[1], color[0], 1.0);
  }
`;

export function ShaderAnimation(props: { className?: string; intensity?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState>({
    renderer: null,
    animationId: null,
    resizeObserver: null,
    onWindowResize: null,
    uniforms: null,
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    const uniforms = sceneRef.current.uniforms;
    if (uniforms) {
      uniforms.intensity.value = props.intensity ?? 1;
    }
  }, [props.intensity]);

  useEffect(() => {
    if (reduced || !containerRef.current) return;

    let disposed = false;
    const container = containerRef.current;

    const cleanup = () => {
      if (sceneRef.current.animationId != null) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.animationId = null;
      }
      if (sceneRef.current.resizeObserver) {
        sceneRef.current.resizeObserver.disconnect();
        sceneRef.current.resizeObserver = null;
      }
      if (sceneRef.current.onWindowResize) {
        window.removeEventListener("resize", sceneRef.current.onWindowResize);
        sceneRef.current.onWindowResize = null;
      }
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose();
        const canvas = sceneRef.current.renderer.domElement;
        if (canvas.parentElement === container) {
          container.removeChild(canvas);
        }
        sceneRef.current.renderer = null;
      }
      sceneRef.current.uniforms = null;
      container.replaceChildren();
    };

    const init = (THREE: ThreeModule) => {
      if (disposed || !containerRef.current) return;

      container.replaceChildren();

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(2, 2);

      const uniforms = {
        time: { value: 1.0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        intensity: { value: props.intensity ?? 1 },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
      });

      scene.add(new THREE.Mesh(geometry, material));

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const onResize = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        renderer.setSize(rect.width, rect.height);
        uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
      };

      onResize();
      window.addEventListener("resize", onResize, false);
      const resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(container);

      sceneRef.current = {
        renderer,
        animationId: null,
        resizeObserver,
        onWindowResize: onResize,
        uniforms,
      };

      const animate = () => {
        if (disposed) return;
        sceneRef.current.animationId = requestAnimationFrame(animate);
        uniforms.time.value += 0.05;
        renderer.render(scene, camera);
      };

      animate();
    };

    void import("three").then((THREE) => {
      if (!disposed) init(THREE);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={props.className ?? "absolute inset-0 h-full w-full"}
    />
  );
}
