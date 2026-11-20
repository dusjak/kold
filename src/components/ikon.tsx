export function Ikon({ navn }: { navn: string }) {
  const mask = `url(/ikon/${navn}.svg)`;
  return (
    <span
      className="ikon"
      aria-hidden="true"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
