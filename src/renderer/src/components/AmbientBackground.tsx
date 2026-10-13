// The ocean behind the whole app: a moon, slow currents, glowing plankton, and
// the tide along the bottom, which rises as you log focus time today.
// Purely decorative: fixed, behind content, ignores the mouse.

const plankton = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${18 + ((i * 53) % 74)}%`,
  size: 2 + (i % 3),
  delay: `${(i * 1.3) % 9}s`,
  duration: `${4 + (i % 5) * 1.6}s`,
  opacity: 0.35 + (i % 4) * 0.15
}))

/** Four wave periods across 1600 units; sliding by half loops seamlessly. */
const WAVE_PATH =
  'M0 40 Q100 0 200 40 T400 40 T600 40 T800 40 T1000 40 T1200 40 T1400 40 T1600 40 V400 H0 Z'

function Wave({
  className,
  opacity,
  color
}: {
  className: string
  opacity: number
  color: string
}): React.JSX.Element {
  return (
    <div className={`absolute inset-x-0 bottom-0 h-full w-[200%] ${className}`}>
      <svg
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        className="h-full w-full"
        style={{ opacity }}
      >
        <path d={WAVE_PATH} fill={color} />
      </svg>
    </div>
  )
}

export function AmbientBackground({ tide }: { tide: number }): React.JSX.Element {
  // Low water at the start of the day, up to about a third of the window at your goal.
  const height = `calc(4vh + ${Math.min(1, Math.max(0, tide)) * 30}vh)`

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* moon and its glow */}
      <div className="absolute top-[7%] right-[9%] h-72 w-72 animate-breathe rounded-full bg-glow/10 blur-[90px]" />
      <div className="absolute top-[10%] right-[13%] h-24 w-24 rounded-full bg-[radial-gradient(circle,rgb(242_212_155/0.32)_0%,rgb(242_212_155/0.12)_38%,transparent_70%)]" />

      {/* slow currents */}
      <div className="absolute -bottom-1/3 -left-1/4 h-[80vh] w-[80vh] animate-drift-a rounded-full bg-deep/40 blur-[130px]" />
      <div className="absolute top-1/4 left-1/3 h-[55vh] w-[55vh] animate-drift-b rounded-full bg-accent/8 blur-[140px]" />

      {/* plankton */}
      {plankton.map((p, i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-accent shadow-[0_0_8px_1px_var(--color-accent)]"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              '--speck-opacity': p.opacity
            } as React.CSSProperties
          }
        />
      ))}

      {/* the tide */}
      <div
        className="absolute inset-x-0 bottom-0 animate-bob transition-[height] duration-[3000ms] ease-in-out"
        style={{ height }}
      >
        <Wave className="animate-wave-c" opacity={0.35} color="var(--color-deep)" />
        <Wave className="animate-wave-b top-3" opacity={0.3} color="var(--color-deep)" />
        <Wave className="animate-wave-a top-6" opacity={0.12} color="var(--color-accent)" />
      </div>
    </div>
  )
}
