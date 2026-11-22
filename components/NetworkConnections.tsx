const metricPorts = [100, 300, 500, 700, 900];
export function NetworkConnections({ segment }: { segment: 'metrics' | 'workflow' }) {
  const route = {
    metrics: 'M100 4 V9 Q100 28 118 28 H471 Q492 28 492 51 V108 M300 4 V9 Q300 28 318 28 M500 4 V108 M700 4 V9 Q700 28 682 28 M900 4 V9 Q900 28 882 28 H529 Q508 28 508 51 V108',
    workflow: 'M500 0 V52 M492 0 V10 Q492 29 475 29 H155 Q137 29 137 52 M508 0 V10 Q508 29 525 29 H845 Q863 29 863 52',
  }[segment];
  const height = segment === 'metrics' ? 108 : 52;
  const ports = segment === 'metrics' ? metricPorts : [137, 500, 863];
  const portY = segment === 'metrics' ? 4 : height - 4;

  return (
    <svg className={'qa-network qa-network-' + segment} viewBox={`0 0 1000 ${height}`}
      preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="qa-network-full">
        <path className="qa-cable-shadow" d={route} />
        <path className="qa-cable-jacket" d={route} />
        <path className="qa-cable-core" d={route} />
        <path className="qa-cable-highlight" d={route} />
        {ports.map((x) => (
          <g key={x} transform={`translate(${x} ${portY})`}>
            <rect className="qa-port" x="-7" y="-3.5" width="14" height="7" rx="1.5" />
            <rect className="qa-port-inset" x="-4.5" y="-1.8" width="9" height="3.6" rx=".7" />
            <path className="qa-port-light" d="M-2 0 H2" />
          </g>
        ))}
        {segment === 'metrics' && <g>
          <rect className="qa-hub" x="484" y="56" width="32" height="12" rx="2" />
          <rect className="qa-port-inset" x="487" y="59" width="26" height="6" rx="1" />
          <path className="qa-port-light" d="M489 62 h1 m2 0 h1 m2 0 h1 m2 0 h1 m2 0 h1 m2 0 h1 m2 0 h1 m2 0 h1" />
        </g>}
        {segment === 'workflow' && <g>
          <rect className="qa-port" x="495" y="0" width="10" height="7" rx="1.5" />
          <path className="qa-port-light" d="M498 4 H502" />
        </g>}
      </g>
      <g className="qa-network-simple">
        <path className="qa-cable-jacket" d={`M500 4 V${height - 5}`} />
        <path className="qa-cable-core" d={`M500 4 V${height - 5}`} />
        <rect className="qa-port" x="494" y={height - 8} width="12" height="6" rx="1.5" />
      </g>
    </svg>
  );
}
