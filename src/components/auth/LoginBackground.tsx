'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function LoginBackground() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate particles on client side to avoid SSR/hydration mismatch
    const generated = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 2, // 2px to 6px
      duration: Math.random() * 12 + 10, // 10s to 22s
      delay: Math.random() * -22, // Start at different heights immediately
      opacity: Math.random() * 0.4 + 0.15,
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-slate-950 to-[#00263e] overflow-hidden pointer-events-none">
      {/* Ambient corporate blue glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-brand-600/20 blur-[130px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-500/15 blur-[120px]" />
      <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-gold-500/5 blur-[90px]" />

      {/* Floating Particles (Dots moving from bottom to top) */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-brand-400 pointer-events-none animate-float-particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            bottom: '-20px',
            boxShadow: '0 0 8px hsla(203, 100%, 55%, 0.4)',
            '--particle-duration': `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          } as any}
        />
      ))}
    </div>
  );
}
