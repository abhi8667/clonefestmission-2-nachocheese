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

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle dot grid
      const gridSize = 32;
      ctx.fillStyle = 'rgba(242, 241, 234, 0.04)';
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Corner subtle crosshairs
      const chSize = 12;
      ctx.strokeStyle = 'rgba(242, 241, 234, 0.08)';
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
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
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
