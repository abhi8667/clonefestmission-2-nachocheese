import React, { useEffect, useRef } from 'react';

export const CyberBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Crosshair target coords
    let scanY = 0;
    let scanSpeed = 0.4;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle horizontal scanning laser line
      scanY += scanSpeed;
      if (scanY > height) scanY = 0;

      ctx.strokeStyle = 'rgba(234, 88, 12, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // Laser glowing trail
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
      grad.addColorStop(0, 'rgba(234, 88, 12, 0)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0.04)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, width, 30);

      // 2. Corner crosshairs at viewport corners
      const chSize = 14;
      ctx.strokeStyle = 'rgba(242, 241, 234, 0.18)';
      ctx.lineWidth = 1;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(24, 24); ctx.lineTo(24 + chSize, 24);
      ctx.moveTo(24, 24); ctx.lineTo(24, 24 + chSize);
      // Top-right
      ctx.moveTo(width - 24, 24); ctx.lineTo(width - 24 - chSize, 24);
      ctx.moveTo(width - 24, 24); ctx.lineTo(width - 24, 24 + chSize);
      // Bottom-left
      ctx.moveTo(24, height - 24); ctx.lineTo(24 + chSize, height - 24);
      ctx.moveTo(24, height - 24); ctx.lineTo(24, height - 24 - chSize);
      // Bottom-right
      ctx.moveTo(width - 24, height - 24); ctx.lineTo(width - 24 - chSize, height - 24);
      ctx.moveTo(width - 24, height - 24); ctx.lineTo(width - 24, height - 24 - chSize);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  );
};
