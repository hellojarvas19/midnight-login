import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftX: number;
  opacity: number;
  delay: number;
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5 + 0.3,
      speedY: Math.random() * 0.4 + 0.1,
      driftX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 200,
    }));

    let animId: number;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.3,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );
      grad.addColorStop(0, "hsla(245, 40%, 10%, 1)");
      grad.addColorStop(0.5, "hsla(240, 20%, 5%, 1)");
      grad.addColorStop(1, "hsla(240, 10%, 2%, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
      particles.forEach((p) => {
        if (frame < p.delay) return;

        const t = (frame - p.delay) * 0.5;
        const py = (p.y - t * p.speedY + canvas.height) % canvas.height;
        const px = p.x + Math.sin(t * 0.01 + p.delay) * 15;

        ctx.beginPath();
        ctx.arc(px % canvas.width, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(245, 80%, 80%, ${p.opacity})`;
        ctx.fill();
      });

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Canvas particles */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Floating orbs */}
      <div
        className="orb-glow-blue animate-float-1 absolute"
        style={{ width: 500, height: 500, top: "-10%", left: "-5%" }}
      />
      <div
        className="orb-glow-violet animate-float-2 absolute"
        style={{ width: 600, height: 600, bottom: "-15%", right: "-10%" }}
      />
      <div
        className="orb-glow-indigo animate-float-3 absolute"
        style={{ width: 400, height: 400, top: "30%", right: "20%" }}
      />
      <div
        className="orb-glow-blue animate-float-2 absolute"
        style={{ width: 300, height: 300, bottom: "10%", left: "15%" }}
      />
    </div>
  );
};

export default ParticleBackground;
