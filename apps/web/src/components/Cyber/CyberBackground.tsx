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

    // Network Nodes & Data Packets
    const NODE_COUNT = Math.min(30, Math.floor(window.innerWidth / 45));
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
    }> = [];

    const colors = [
      'rgba(0, 229, 255, 0.25)', // Cyan
      'rgba(0, 245, 155, 0.2)',  // Neon Green
      'rgba(168, 85, 247, 0.15)' // Purple
    ];

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2
      });
    }

    // Packet transmission along node lines
    const packets: Array<{
      from: number;
      to: number;
      progress: number;
      speed: number;
      color: string;
    }> = [];

    let lastPacketTime = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Spawn packets periodically
      if (time - lastPacketTime > 1800 && nodes.length > 2) {
        lastPacketTime = time;
        const fromIdx = Math.floor(Math.random() * nodes.length);
        // Find nearest node
        let nearestIdx = (fromIdx + 1) % nodes.length;
        let minDist = Infinity;
        for (let j = 0; j < nodes.length; j++) {
          if (j === fromIdx) continue;
          const dx = nodes[fromIdx].x - nodes[j].x;
          const dy = nodes[fromIdx].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist && dist < 220) {
            minDist = dist;
            nearestIdx = j;
          }
        }
        if (minDist < 220) {
          packets.push({
            from: fromIdx,
            to: nearestIdx,
            progress: 0,
            speed: 0.008 + Math.random() * 0.008,
            color: 'rgba(0, 229, 255, 0.8)'
          });
        }
      }

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        node.pulse += 0.02;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.5;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.06;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Update and draw packets
      for (let k = packets.length - 1; k >= 0; k--) {
        const p = packets[k];
        p.progress += p.speed;

        if (p.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        const nodeA = nodes[p.from];
        const nodeB = nodes[p.to];
        if (!nodeA || !nodeB) {
          packets.splice(k, 1);
          continue;
        }

        const currentX = nodeA.x + (nodeB.x - nodeA.x) * p.progress;
        const currentY = nodeA.y + (nodeB.y - nodeA.y) * p.progress;

        ctx.beginPath();
        ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

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
      className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
};
