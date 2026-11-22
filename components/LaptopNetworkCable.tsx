'use client';

import { useEffect, useRef, useState } from 'react';

type Cable = { fromX: number; fromY: number; toX: number; toY: number; outerX: number };

export function LaptopNetworkCable() {
  const svg = useRef<SVGSVGElement>(null);
  const [cable, setCable] = useState<Cable>();

  useEffect(() => {
    const overlay = svg.current;
    const scene = overlay?.closest('main')?.querySelector('.laptop-projection');
    const hero = scene?.closest('.hero');
    const metrics = overlay?.parentElement?.querySelector('.metrics');
    if (!overlay || !scene || !hero || !metrics) return;

    function measure() {
      const photo = scene!.getBoundingClientRect();
      if (photo.width === 0 || !overlay!.getClientRects().length) return;
      const bounds = overlay!.getBoundingClientRect();
      const bar = metrics!.getBoundingClientRect();
      // The photographed port is on the right edge of the laptop base in the 1774 × 735 crop.
      const fromX = photo.x - bounds.x + (1651 / 1774) * photo.width;
      const fromY = photo.y - bounds.y + (615 / 735) * photo.height;
      const toX = bar.right - bounds.x;
      const toY = bar.y - bounds.y + bar.height / 2;
      const edge = hero!.getBoundingClientRect().right - bounds.x;
      const outerX = Math.min(edge - 12, Math.max(fromX, toX) + 34);
      setCable({ fromX, fromY, toX, toY, outerX });
    }

    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    observer.observe(scene);
    observer.observe(metrics);
    measure();
    return () => observer.disconnect();
  }, []);

  const route = cable && `M${cable.fromX} ${cable.fromY}
    C${cable.outerX} ${cable.fromY}, ${cable.outerX} ${cable.fromY}, ${cable.outerX} ${(cable.fromY + cable.toY) / 2}
    Q${cable.outerX} ${cable.toY}, ${cable.toX} ${cable.toY}`;

  return (
    <svg ref={svg} className="laptop-network-cable" aria-hidden="true" focusable="false">
      {cable && <>
        <path className="qa-cable-shadow" d={route} />
        <path className="qa-cable-jacket" d={route} />
        <path className="qa-cable-core" d={route} />
        <path className="qa-cable-highlight" d={route} />
        <g transform={`translate(${cable.fromX} ${cable.fromY})`}>
          <rect className="laptop-cable-plug" x="-1" y="-3.5" width="17" height="7" rx="2" />
          <rect className="qa-port" x="3" y="-4.5" width="5" height="9" rx="1" />
          <path className="qa-port-light" d="M5.5 -1 V1" />
        </g>
        <g transform={`translate(${cable.toX} ${cable.toY})`}>
          <rect className="laptop-cable-plug" x="1" y="-3.5" width="14" height="7" rx="2" />
          <rect className="qa-port" x="0" y="-6" width="6" height="12" rx="1.5" />
          <path className="qa-port-light" d="M3 -1.5 V1.5" />
        </g>
      </>}
    </svg>
  );
}
