import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import "./Landingpage.css";

class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = "!<>-_\\/[]{}—=+*^?#________";
    this.update = this.update.bind(this);
  }
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => (this.resolve = resolve));
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || "";
      const to = newText[i] || "";
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  update() {
    let output = "";
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) { complete++; output += to; }
      else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) { char = this.randomChar(); this.queue[i].char = char; }
        output += `<span class="scramble-char">${char}</span>`;
      } else { output += from; }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) { this.resolve(); }
    else { this.frameRequest = requestAnimationFrame(this.update); this.frame++; }
  }
  randomChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }
}

export default function LandingPage({ onRevealStart }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    // ── Three.js ──────────────────────────────────────────
    const container = canvasRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.002);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const makeParticles = (count, spread, color) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * spread;
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size: 0.15, color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
      return new THREE.Points(geo, mat);
    };

    const particlesMesh = makeParticles(2000, 100, 0x6366f1);
    const accentMesh    = makeParticles(500,   80,  0xec4899);
    const geoMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(15, 1),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.05 })
    );
    scene.add(particlesMesh, accentMesh, geoMesh);

    let mouseX = 0, mouseY = 0;
    const onMove = (e) => { mouseX = e.clientX - window.innerWidth / 2; mouseY = e.clientY - window.innerHeight / 2; };
    document.addEventListener("mousemove", onMove);
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let rafId;
    const tick = () => {
      const t = clock.getElapsedTime();
      const tx = mouseX * 0.001, ty = mouseY * 0.001;
      particlesMesh.rotation.y += 0.05 * (tx - particlesMesh.rotation.y);
      particlesMesh.rotation.x += 0.05 * (ty - particlesMesh.rotation.x);
      accentMesh.rotation.y    += 0.02 * (tx - accentMesh.rotation.y);
      accentMesh.rotation.x    += 0.02 * (ty - accentMesh.rotation.x);
      geoMesh.rotation.y = t * 0.05;
      geoMesh.rotation.x = t * 0.02;
      particlesMesh.position.y = Math.sin(t * 0.5) * 0.5;
      accentMesh.position.y    = Math.sin(t * 0.3) * 0.5;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // ── Loader → Intro → Reveal ───────────────────────────
    const loader      = document.getElementById("loader");
    const introStage  = document.getElementById("intro-stage");
    const introLogoEl = document.getElementById("intro-logo-text");
    const scannerEl   = document.getElementById("scanner");
    const scrambler   = new TextScramble(introLogoEl);

    gsap.to(".loader-progress", {
      width: "100%", duration: 1.8, ease: "power2.inOut",
      onComplete: () =>
        gsap.to(loader, {
          opacity: 0, duration: 0.7, ease: "power2.inOut",
          onComplete: () => { loader.style.display = "none"; startIntro(); },
        }),
    });

    function startIntro() {
      const tl = gsap.timeline();
      tl.fromTo(introLogoEl, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: "power3.out" });
      scrambler.setText("SmartDocQ");
      tl.to(scannerEl, { top: "100%", opacity: 1, scaleX: 1.2, duration: 1.5, ease: "power1.inOut", delay: 1.5 }, "<");
      tl.to(scannerEl, { opacity: 0, duration: 0.3 });
      const tlF = gsap.timeline({ delay: 1.0 });
      tlF.to(introLogoEl, { scale: 1.1, textShadow: "0 0 60px rgba(99,102,241,0.8)", duration: 0.6, ease: "power1.inOut" });
      tlF.to(introLogoEl, { scale: 0.25, y: () => -window.innerHeight / 2 + 40, x: () => -window.innerWidth / 2 + 80, filter: "blur(15px)", opacity: 0, duration: 2.0, ease: "power4.inOut" });
      tlF.to(camera.position, { z: 15, duration: 2.0, ease: "power4.inOut" }, "<");
      tlF.to(particlesMesh.rotation, { y: particlesMesh.rotation.y + Math.PI * 2, duration: 2.0, ease: "power2.in" }, "<");
      tlF.to(".nav-logo-container", { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, "-=1.0");
      tlF.to(introStage, { display: "none" });
      tlF.call(revealMain, [], "+=0.6");
    }

    function freezeScene() {
      // ── Stop the animation loop ──
      cancelAnimationFrame(rafId);
      rafId = null;

      // ── Remove mouse tracking (no longer needed) ──
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);

      // ── Render one final static frame as frozen bg ──
      renderer.render(scene, camera);
    }

    function revealMain() {
      // ── Freeze Three.js first ──
      freezeScene();

      // ── Notify App ──
      if (onRevealStart) onRevealStart();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          gsap.set("#navbar", { y: -20, opacity: 0 });
          gsap.set(".hero-anim", { y: 20, opacity: 0 });

          const tl = gsap.timeline();
          tl.to("#navbar",    { y: 0, opacity: 1, duration: 1.2, ease: "power2.out" });
          tl.to(".hero-anim", { y: 0, opacity: 1, duration: 1.2, stagger: 0.2, ease: "power3.out" }, "-=0.5");
        });
      });
    }

    return () => {
      cancelAnimationFrame(rafId);

      // ── Cleanup Three.js Resources ──
      particlesMesh.geometry.dispose();
      particlesMesh.material.dispose();
      accentMesh.geometry.dispose();
      accentMesh.material.dispose();
      geoMesh.geometry.dispose();
      geoMesh.material.dispose();
      renderer.dispose();

      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);

      // ── Kill GSAP Animations ──
      gsap.killTweensOf(introLogoEl);
      gsap.killTweensOf(scannerEl);
      gsap.killTweensOf(".loader-progress");
      gsap.killTweensOf("#navbar");
      gsap.killTweensOf(".hero-anim");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* ── Loader ── */}
      <div id="loader">
        <div className="loader-name">SmartDocQ</div>
        <div className="loader-dot" />
        <div className="loader-bar-wrap">
          <div className="loader-progress" />
        </div>
      </div>

      {/* ── Intro Stage ── */}
      <div id="intro-stage">
        <div className="intro-logo" id="intro-logo-text">
          SmartDocQ
          <div className="scanner-line" id="scanner" />
        </div>
      </div>

      {/* ── Three.js Canvas ── */}
      <div id="canvas-container" ref={canvasRef} />
    </>
  );
}