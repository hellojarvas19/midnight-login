import { useEffect, useRef } from "react";

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

    // Particles (now magenta-tinted)
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.4 + 0.3,
      speedY: Math.random() * 0.35 + 0.08,
      opacity: Math.random() * 0.55 + 0.2,
      delay: Math.random() * 200,
    }));

    // Ripple circles
    const ripples: { x: number; y: number; r: number; maxR: number; alpha: number; speed: number }[] = [];
    const spawnRipple = () => {
      ripples.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0,
        maxR: 180 + Math.random() * 200,
        alpha: 0.35,
        speed: 0.6 + Math.random() * 0.8,
      });
    };
    // Seed initial ripples
    for (let i = 0; i < 6; i++) spawnRipple();
    const rippleInterval = setInterval(spawnRipple, 1800);

    let animId: number;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background — near-pure black with magenta edge tint
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.35, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.85
      );
      grad.addColorStop(0,   "hsla(315, 30%, 5%, 1)");
      grad.addColorStop(0.4, "hsla(330, 20%, 3%, 1)");
      grad.addColorStop(1,   "hsla(330, 10%, 1%, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Water ripple circles
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += rp.speed;
        rp.alpha *= 0.988;

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(315, 95%, 62%, ${rp.alpha * 1.1})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Second inner ring — brighter
        if (rp.r > 30) {
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(340, 85%, 58%, ${rp.alpha * 0.7})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        // Third tiny inner ring
        if (rp.r > 60) {
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.r * 0.25, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(315, 100%, 75%, ${rp.alpha * 0.5})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }

        if (rp.r >= rp.maxR || rp.alpha < 0.01) ripples.splice(i, 1);
      }

      // Floating star particles — brighter magenta tint
      particles.forEach((p) => {
        if (frame < p.delay) return;
        const t = (frame - p.delay) * 0.5;
        const py = (p.y - t * p.speedY + canvas.height) % canvas.height;
        const px = p.x + Math.sin(t * 0.009 + p.delay) * 12;

        // Core glow dot
        ctx.beginPath();
        ctx.arc(px % canvas.width, py, p.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(315, 95%, 85%, ${p.opacity * 0.5})`;
        ctx.fill();

        // Bright centre
        ctx.beginPath();
        ctx.arc(px % canvas.width, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(315, 90%, 92%, ${p.opacity})`;
        ctx.fill();
      });

      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(rippleInterval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Canvas: particles + water ripples */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Floating magenta orbs — more intense */}
      <div
        className="orb-glow-blue animate-float-1 absolute"
        style={{ width: 600, height: 600, top: "-15%", left: "-10%" }}
      />
      <div
        className="orb-glow-violet animate-float-2 absolute"
        style={{ width: 700, height: 700, bottom: "-20%", right: "-15%" }}
      />
      <div
        className="orb-glow-indigo animate-float-3 absolute"
        style={{ width: 420, height: 420, top: "25%", right: "15%" }}
      />
      <div
        className="orb-glow-blue animate-float-2 absolute"
        style={{ width: 320, height: 320, bottom: "8%", left: "10%", animationDelay: "-4s" }}
      />
      {/* Centre bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsla(315,70%,30%,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Animated wave overlay */}
      <div
        className="animate-wave absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, hsla(315,85%,35%,0.07) 0%, transparent 40%, hsla(340,75%,30%,0.06) 70%, transparent 100%)",
          backgroundSize: "400% 400%",
        }}
      />
    </div>
  );
};

export default ParticleBackground;

