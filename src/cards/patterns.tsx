import type { CardDesign } from "./design";
import { ART_H, ART_W } from "./design";

/** Background texture for a generated card, drawn in white at low opacity over the gradient. */
export function Pattern({ design }: { design: CardDesign }) {
  const { pattern, anchor, patternScale: k } = design;
  const pid = `pat-${design.id}`;
  const fill = `url(#${pid})`;
  const full = <rect width={ART_W} height={ART_H} fill={fill} />;

  switch (pattern) {
    case "dots":
      return (
        <>
          <defs><pattern id={pid} width={9 * k} height={9 * k} patternUnits="userSpaceOnUse"><circle cx={2.2 * k} cy={2.2 * k} r={1.5 * k} fill="#fff" opacity=".2" /><circle cx={6.7 * k} cy={6.7 * k} r={0.9 * k} fill="#fff" opacity=".14" /></pattern></defs>
          {full}
        </>
      );
    case "stripes":
      return (
        <>
          <defs><pattern id={pid} width={9 * k} height={9 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={3.6 * k} height={9 * k} fill="#fff" opacity=".13" /></pattern></defs>
          {full}
        </>
      );
    case "gingham":
      return (
        <>
          <defs><pattern id={pid} width={14 * k} height={14 * k} patternUnits="userSpaceOnUse"><rect width={7 * k} height={14 * k} fill="#fff" opacity=".1" /><rect width={14 * k} height={7 * k} fill="#fff" opacity=".1" /></pattern></defs>
          {full}
        </>
      );
    case "scallops":
      return (
        <>
          <defs><pattern id={pid} width={14 * k} height={14 * k} patternUnits="userSpaceOnUse"><g fill="none" stroke="#fff" stroke-width="1.1" opacity=".22">{[[0, 0], [14, 0], [7, 7], [0, 14], [14, 14]].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx! * k} cy={cy! * k} r={7 * k} />)}</g></pattern></defs>
          {full}
        </>
      );
    case "waves":
      return (
        <>
          <defs><pattern id={pid} width={24 * k} height={9 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><path d={`M0 ${4.5 * k} Q${6 * k} 0 ${12 * k} ${4.5 * k} T${24 * k} ${4.5 * k}`} fill="none" stroke="#fff" stroke-width="1.3" opacity=".24" /></pattern></defs>
          {full}
        </>
      );
    case "rings":
      return (
        <g fill="none" stroke="#fff" stroke-width="1.6" opacity=".17">
          {[10, 20, 30, 40, 50, 60, 70, 80].map((r) => <circle key={r} cx={anchor.x} cy={anchor.y} r={r * k} />)}
        </g>
      );
    case "rays": {
      const n = 16;
      const R = 160;
      const wedges = Array.from({ length: n / 2 }, (_, i) => {
        const a0 = (i * 2 * Math.PI) / (n / 2);
        const a1 = a0 + Math.PI / n;
        const pt = (a: number) => `${(anchor.x + R * Math.cos(a)).toFixed(1)} ${(anchor.y + R * Math.sin(a)).toFixed(1)}`;
        return <path key={i} d={`M${anchor.x} ${anchor.y}L${pt(a0)}L${pt(a1)}Z`} />;
      });
      return <g fill="#fff" opacity=".11">{wedges}</g>;
    }
    case "arches":
      return (
        <g fill="none" stroke="#fff" opacity=".13" stroke-width={7 * k}>
          {[18, 32, 46, 60, 74].map((r) => <path key={r} d={`M${anchor.x - r * k} ${ART_H + 4} A${r * k} ${r * k} 0 0 1 ${anchor.x + r * k} ${ART_H + 4}`} />)}
        </g>
      );
  }
}
