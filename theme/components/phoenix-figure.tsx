import './phoenix-figure.css';

/**
 * The phoenix itself. This is the placement scaffold: a spine, a wing axis,
 * the ember at the heart and the ground under the tail. The drawing replaces
 * the marks inside the SVG; the viewBox and the four anchors stay put so the
 * paths around it keep lining up.
 *
 * Anchors (viewBox 0 0 300 400): head 150,40 · heart 150,170 ·
 * wingtips 20,150 and 280,150 · tail 150,380.
 */
export function PhoenixFigure() {
  return (
    <svg className="phoenix-figure" viewBox="0 0 300 400" role="presentation" aria-hidden="true">
      <path className="phoenix-figure__guide" d="M150 40 V380" />
      <path className="phoenix-figure__guide" d="M20 150 Q150 110 280 150" />
      <circle className="phoenix-figure__ember" cx="150" cy="170" r="7" />
    </svg>
  );
}
