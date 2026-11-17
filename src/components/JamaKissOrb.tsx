import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PH_ZONES, PhZoneId } from '../data/jamakissData';

interface JamaKissOrbProps {
  zoneId: PhZoneId;
  isOpen: boolean;
  isThinking: boolean;
  onClick: () => void;
}

export const JamaKissOrb: React.FC<JamaKissOrbProps> = ({
  zoneId,
  isOpen,
  isThinking,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    speedMultiplier: 1.0,
    targetMultiplier: 1.0,
    targetDeep: new THREE.Vector3(0.42, 0.02, 0.17),
    targetMid: new THREE.Vector3(0.82, 0.07, 0.34),
    targetBright: new THREE.Vector3(1.0, 0.28, 0.56),
  });

  useEffect(() => {
    const zone = PH_ZONES.find((z) => z.id === zoneId) || PH_ZONES[0];
    stateRef.current.targetDeep.set(...zone.orbColors.deep);
    stateRef.current.targetMid.set(...zone.orbColors.mid);
    stateRef.current.targetBright.set(...zone.orbColors.bright);
  }, [zoneId]);

  useEffect(() => {
    if (isThinking) {
      stateRef.current.targetMultiplier = 3.5;
    } else if (isOpen) {
      stateRef.current.targetMultiplier = 1.7;
    } else {
      stateRef.current.targetMultiplier = 1.0;
    }
  }, [isOpen, isThinking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(58, 58);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.4;

    const vertexShader = `
      uniform float uTime;
      uniform float uSpeed;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;

      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        float wave1 = snoise(position * 1.6 + vec3(uTime * 0.7 * uSpeed, uTime * 0.4 * uSpeed, 0.0));
        float wave2 = snoise(position * 3.1 - vec3(0.0, uTime * 0.8 * uSpeed, uTime * 0.5 * uSpeed));
        float wave3 = sin(position.y * 3.0 + uTime * 1.5 * uSpeed) * 0.2;
        vNoise = wave1 * 0.55 + wave2 * 0.35 + wave3 * 0.1;
        vec3 displacementDirection = normalize(normal + vec3(wave1 * 0.4, wave2 * 0.4, 0.0));
        vec3 newPosition = position + displacementDirection * (vNoise * 0.42);
        newPosition.y *= 0.92 + 0.09 * sin(uTime * 1.2 * uSpeed);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uBright;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vNoise;

      void main() {
        vec3 lightGlow = vec3(1.0, 0.9, 0.95);
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = 1.0 - max(dot(viewDirection, vNormal), 0.0);
        fresnel = pow(fresnel, 2.0);
        vec3 baseColor = mix(uDeep, uMid, clamp(vNoise + 0.5, 0.0, 1.0));
        baseColor = mix(baseColor, uBright, fresnel * 0.85);
        baseColor += lightGlow * pow(fresnel, 4.0) * 0.65;
        gl_FragColor = vec4(baseColor, 1.0);
      }
    `;

    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 1.0 },
      uDeep: { value: stateRef.current.targetDeep.clone() },
      uMid: { value: stateRef.current.targetMid.clone() },
      uBright: { value: stateRef.current.targetBright.clone() },
    };

    const geometry = new THREE.SphereGeometry(0.72, 48, 48);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const st = stateRef.current;

      st.speedMultiplier += (st.targetMultiplier - st.speedMultiplier) * 0.1;
      uniforms.uTime.value += delta * 2.0 * st.speedMultiplier;
      uniforms.uSpeed.value = st.speedMultiplier;

      uniforms.uDeep.value.lerp(st.targetDeep, 0.07);
      uniforms.uMid.value.lerp(st.targetMid, 0.07);
      uniforms.uBright.value.lerp(st.targetBright, 0.07);

      mesh.rotation.y += delta * 0.7 * st.speedMultiplier;
      mesh.rotation.x += delta * 0.35 * st.speedMultiplier;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        stateRef.current.targetMultiplier = 2.8;
      }}
      onMouseLeave={() => {
        stateRef.current.targetMultiplier = isOpen ? 1.7 : 1.0;
      }}
      className="floating-orb-button relative flex items-center justify-center focus:outline-none group"
      aria-label="Abrir consejera virtual JamaKiss"
      title="Hablar con la consejera JamaKiss"
    >
      <div className="relative w-[58px] h-[58px] flex items-center justify-center">
        <div className="orb-halo" />
        <canvas ref={canvasRef} className="orb-canvas" />
      </div>
      {!isOpen && (
        <span className="hidden sm:inline-flex absolute right-16 whitespace-nowrap bg-white/95 backdrop-blur-md text-[#720E36] border border-[#F8C2D7] text-xs font-medium px-3 py-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Dudas? Habla con JamaKiss
        </span>
      )}
    </button>
  );
};

