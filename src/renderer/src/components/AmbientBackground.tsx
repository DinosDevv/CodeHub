// Slow-drifting light blobs and floating dust specks behind the whole app.
// Purely decorative: fixed, behind content, ignores the mouse.

const specks = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  top: `${30 + ((i * 37) % 65)}%`,
  size: 2 + (i % 3),
  delay: `${(i * 1.7) % 14}s`,
  duration: `${12 + (i % 5) * 3}s`,
  opacity: 0.25 + (i % 4) * 0.12
}))

export function AmbientBackground(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-1/4 -left-1/4 h-[70vh] w-[70vh] animate-drift-a rounded-full bg-glow/25 blur-[120px]" />
      <div className="absolute -right-1/4 -bottom-1/3 h-[80vh] w-[80vh] animate-drift-b rounded-full bg-accent/22 blur-[140px]" />
      <div className="absolute top-1/3 left-1/3 h-[50vh] w-[50vh] animate-drift-c rounded-full bg-[#5b4b9a]/25 blur-[120px]" />
      {specks.map((s, i) => (
        <span
          key={i}
          className="absolute animate-float rounded-full bg-fg"
          style={
            {
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              '--speck-opacity': s.opacity
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
