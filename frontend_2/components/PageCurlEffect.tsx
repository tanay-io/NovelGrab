"use client";

import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════
//  GLSL SHADERS — Cylindrical / Conical page-curl deformation
// ═══════════════════════════════════════════════════════════════

const vertexShader = /* glsl */ `
  uniform float uProgress;     // 0 → 1  (how far the page is turned)
  uniform vec2  uMouse;        // normalised mouse pos on the page
  uniform float uRadius;       // curl cylinder radius
  uniform float uPageAspect;   // width / height of the page

  varying vec2  vUv;
  varying float vCurlAmount;   // 0 = flat, 1 = fully curled (for lighting)
  varying float vShadow;       // shadow darkness for AO

  // Rotate around an arbitrary axis (the fold line)
  mat3 rotateAroundAxis(vec3 axis, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    float t = 1.0 - c;
    return mat3(
      t * axis.x * axis.x + c,           t * axis.x * axis.y - s * axis.z,  t * axis.x * axis.z + s * axis.y,
      t * axis.x * axis.y + s * axis.z,  t * axis.y * axis.y + c,           t * axis.y * axis.z - s * axis.x,
      t * axis.x * axis.z - s * axis.y,  t * axis.y * axis.z + s * axis.x,  t * axis.z * axis.z + c
    );
  }

  void main() {
    vUv = uv;

    vec3 pos = position;

    // ── Deformation axis ──
    // The fold line sweeps from right edge (progress=0) to left (progress=1).
    // It's angled slightly based on mouse Y to give the "corner peel" feel.
    float foldX = mix(1.0, -1.0, uProgress);
    float angleOffset = (uMouse.y - 0.5) * 0.3; // slight tilt from mouse Y
    float foldAngle = 0.0 + angleOffset;

    // Fold-line direction vector
    vec3 foldDir = normalize(vec3(sin(foldAngle), cos(foldAngle), 0.0));
    // Point on the fold line
    vec3 foldOrigin = vec3(foldX, 0.0, 0.0);

    // ── Distance of this vertex from the fold line ──
    vec3 toVertex = pos - foldOrigin;
    float distAlongFold = dot(toVertex, foldDir);
    vec3 projected = foldOrigin + foldDir * distAlongFold;
    vec3 perp = pos - projected;
    float perpDist = length(perp);
    vec3 perpDir = perpDist > 0.001 ? perp / perpDist : vec3(1.0, 0.0, 0.0);

    // signed distance: positive = right of fold (still flat), negative = left (to be curled)
    float signedDist = dot(perpDir, vec3(1.0, 0.0, 0.0));
    float d = perpDist * sign(signedDist);

    // ── Cylindrical mapping ──
    // Points "behind" the fold line (d < 0) wrap around the cylinder.
    float R = uRadius;
    float curlZone = 3.14159 * R; // half circumference = max wrap distance

    vCurlAmount = 0.0;
    vShadow = 0.0;

    if (d < 0.0) {
      float absDist = -d;

      if (absDist < curlZone) {
        // ── On the cylinder ──
        float theta = absDist / R;
        float newPerp = R * sin(theta);
        float newZ    = R * (1.0 - cos(theta));

        pos = projected + perpDir * (-newPerp) + vec3(0.0, 0.0, newZ);
        vCurlAmount = theta / 3.14159;

        // Conical effect: vertices further from mouse Y lift higher
        float coneFactor = abs(pos.y - (uMouse.y * 2.0 - 1.0)) * 0.15;
        pos.z += coneFactor * vCurlAmount * uProgress;

      } else {
        // ── Past the cylinder (flat on the back side) ──
        float overshoot = absDist - curlZone;
        float newPerp = -(curlZone - overshoot);
        // Mirror to back: sits flat behind the fold at maximum Z
        pos = projected + perpDir * (overshoot) + vec3(0.0, 0.0, 2.0 * R);
        vCurlAmount = 1.0;
      }

      // Ambient occlusion shadow near the fold crease
      float absFold = abs(d);
      vShadow = smoothstep(0.0, 0.25, 1.0 - absFold / curlZone) * 0.6;
    } else {
      // Still flat, but add a subtle shadow near the fold line
      vShadow = smoothstep(0.0, 0.15, 1.0 - d / 0.3) * 0.25 * uProgress;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTextureFront;
  uniform sampler2D uTextureBack;
  uniform float     uProgress;
  uniform vec3      uPageColor;
  uniform float     uIsDark;

  varying vec2  vUv;
  varying float vCurlAmount;
  varying float vShadow;

  void main() {
    // Decide whether to use front or back texture
    vec4 frontColor = texture2D(uTextureFront, vUv);
    // Back texture is flipped horizontally
    vec4 backColor  = texture2D(uTextureBack, vec2(1.0 - vUv.x, vUv.y));

    // Blend based on curl: when fully curled, show back
    vec4 baseColor = mix(frontColor, backColor, step(0.5, vCurlAmount));

    // ── Ambient Occlusion / Shadow ──
    // Darken near the fold crease
    float ao = 1.0 - vShadow;
    baseColor.rgb *= ao;

    // ── Specular highlight on the curl peak ──
    // Simulate light catching the curved paper
    float highlight = smoothstep(0.3, 0.5, vCurlAmount) * smoothstep(0.7, 0.5, vCurlAmount);
    float specular = highlight * 0.15;
    baseColor.rgb += specular;

    // ── Edge darkening (subtle vignette on the curled portion) ──
    float edgeDark = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x);
    baseColor.rgb *= mix(0.85, 1.0, edgeDark);

    gl_FragColor = baseColor;
  }
`;

// ═══════════════════════════════════════════════════════════════
//  Shadow plane shader — the drop shadow on the "page below"
// ═══════════════════════════════════════════════════════════════

const shadowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shadowFragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform vec2  uMouse;
  varying vec2  vUv;

  void main() {
    // Shadow follows the fold line
    float foldX = mix(1.0, -1.0, uProgress);
    float dist = abs(vUv.x * 2.0 - 1.0 - foldX);
    float shadow = smoothstep(0.5, 0.0, dist) * 0.35 * uProgress;

    // Fade at edges
    shadow *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(0.0, 0.1, 1.0 - vUv.y);

    gl_FragColor = vec4(0.0, 0.0, 0.0, shadow);
  }
`;

// ═══════════════════════════════════════════════════════════════
//  Page Mesh — the deformable paper sheet
// ═══════════════════════════════════════════════════════════════

interface PageMeshProps {
  frontTexture: THREE.Texture | null;
  backTexture: THREE.Texture | null;
  progress: number;
  mousePos: { x: number; y: number };
  pageColor: string;
  isDark: boolean;
  aspect: number;
}

function PageMesh({
  frontTexture,
  backTexture,
  progress,
  mousePos,
  pageColor,
  isDark,
  aspect,
}: PageMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  const colorObj = useMemo(() => new THREE.Color(pageColor), [pageColor]);

  // Blank fallback texture
  const blankTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = pageColor;
    ctx.fillRect(0, 0, 4, 4);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [pageColor]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRadius: { value: 0.12 },
      uPageAspect: { value: aspect },
      uTextureFront: { value: blankTexture },
      uTextureBack: { value: blankTexture },
      uPageColor: { value: colorObj },
      uIsDark: { value: isDark ? 1.0 : 0.0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const shadowUniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    [],
  );

  // Update uniforms on each frame
  useFrame(() => {
    uniforms.uProgress.value = progress;
    uniforms.uMouse.value.set(mousePos.x, mousePos.y);
    uniforms.uTextureFront.value = frontTexture || blankTexture;
    uniforms.uTextureBack.value = backTexture || blankTexture;
    uniforms.uPageColor.value = colorObj;
    uniforms.uIsDark.value = isDark ? 1.0 : 0.0;
    uniforms.uRadius.value = 0.08 + progress * 0.06;

    shadowUniforms.uProgress.value = progress;
    shadowUniforms.uMouse.value.set(mousePos.x, mousePos.y);
  });

  // High-density mesh: 100×100 subdivisions for smooth bending
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 100, 100);
    return geo;
  }, []);

  return (
    <>
      {/* Drop-shadow plane (behind the page) */}
      <mesh ref={shadowRef} position={[0, 0, -0.01]}>
        <planeGeometry args={[2.1, 2.1]} />
        <shaderMaterial
          vertexShader={shadowVertexShader}
          fragmentShader={shadowFragmentShader}
          uniforms={shadowUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* The deformable page */}
      <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Camera controller — fits the page to the viewport
// ═══════════════════════════════════════════════════════════════

function CameraSetup() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = size.width / size.height;
      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.near = -10;
      camera.far = 10;
      camera.position.set(0, 0, 5);
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  Capture HTML element to canvas texture (for page content)
// ═══════════════════════════════════════════════════════════════

async function captureElementToTexture(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<THREE.CanvasTexture | null> {
  try {
    const html2canvas = (await import("html2canvas-pro")).default;
    const canvas = await html2canvas(element, {
      width,
      height,
      scale: 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  Main exported component
// ═══════════════════════════════════════════════════════════════

export type CurlDirection = "next" | "prev";

interface PageCurlEffectProps {
  /** The HTML element to capture as the "current" page texture */
  sourceElement: HTMLElement | null;
  /** Direction of the page turn */
  direction: CurlDirection;
  /** Background color of the page */
  pageColor: string;
  /** Whether dark mode */
  isDark: boolean;
  /** Called when the turn animation finishes */
  onComplete: () => void;
  /** Whether the effect is active */
  active: boolean;
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
}

export function PageCurlEffect({
  sourceElement,
  direction,
  pageColor,
  isDark,
  onComplete,
  active,
  width,
  height,
}: PageCurlEffectProps) {
  const [progress, setProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture | null>(
    null,
  );
  const [backTexture, setBackTexture] = useState<THREE.CanvasTexture | null>(
    null,
  );
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const aspect = width / Math.max(height, 1);
  const ANIM_DURATION = 500; // ms

  // Capture current page when effect becomes active
  useEffect(() => {
    if (!active || !sourceElement) return;

    captureElementToTexture(sourceElement, width, height).then((tex) => {
      if (tex) {
        setFrontTexture(tex);
        // Create a slightly tinted version for the back
        const backCanvas = document.createElement("canvas");
        backCanvas.width = width;
        backCanvas.height = height;
        const ctx = backCanvas.getContext("2d")!;
        ctx.fillStyle = isDark ? "#1a1a1a" : "#f0ebe3";
        ctx.fillRect(0, 0, width, height);
        const backTex = new THREE.CanvasTexture(backCanvas);
        backTex.minFilter = THREE.LinearFilter;
        backTex.magFilter = THREE.LinearFilter;
        setBackTexture(backTex);
      }
    });

    // Start auto-animation
    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      // Ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const p = direction === "next" ? eased : 1 - eased;
      setProgress(p);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Track mouse for interactive curl direction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY =
        "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setMousePos({
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      });
    },
    [],
  );

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40"
      style={{ pointerEvents: "auto" }}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <Canvas
        orthographic
        camera={{
          position: [0, 0, 5],
          left: -aspect,
          right: aspect,
          top: 1,
          bottom: -1,
          near: -10,
          far: 10,
        }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraSetup />
        <PageMesh
          frontTexture={frontTexture}
          backTexture={backTexture}
          progress={progress}
          mousePos={mousePos}
          pageColor={pageColor}
          isDark={isDark}
          aspect={aspect}
        />
      </Canvas>
    </div>
  );
}
