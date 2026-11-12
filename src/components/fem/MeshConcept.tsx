/** Original vector concept illustration; never represents a customer CAD or engine output. */
export function MeshConcept() {
  const p = (x: number, y: number, z: number) =>
    `${(265 + x * 23 - y * 18).toFixed(1)},${(250 + x * 10 + y * 12 - z * 24).toFixed(1)}`;
  const line = (a: number[], b: number[], key: string) => {
    const [x1, y1] = p(...(a as [number, number, number])).split(',');
    const [x2, y2] = p(...(b as [number, number, number])).split(',');
    return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} />;
  };

  const grid = [];

  // 1. 바닥판 윗면 (Z=1, X: 1..9, Y: 0..5) 격자
  for (let x = 2; x <= 8; x++) {
    grid.push(line([x, 0, 1], [x, 5, 1], `topPlateX${x}`));
  }
  for (let y = 1; y <= 4; y++) {
    grid.push(line([1, y, 1], [9, y, 1], `topPlateY${y}`));
  }

  // 2. 기둥 안쪽면 (X=1, Z: 1..7, Y: 0..5) 격자
  for (let z = 2; z <= 6; z++) {
    grid.push(line([1, 0, z], [1, 5, z], `innerColZ${z}`));
  }
  for (let y = 1; y <= 4; y++) {
    grid.push(line([1, y, 1], [1, y, 7], `innerColY${y}`));
  }

  // 3. 기둥 상단 캡 (Z=7, X: 0..1, Y: 0..5) 격자
  for (let y = 1; y <= 4; y++) {
    grid.push(line([0, y, 7], [1, y, 7], `capY${y}`));
  }

  // 4. 바닥판 우측 끝면 (X=9, Z: 0..1, Y: 0..5) 격자
  for (let y = 1; y <= 4; y++) {
    grid.push(line([9, y, 0], [9, y, 1], `rightPlateY${y}`));
  }

  // 5. 정면 L자 앞면 (Y=5, 관찰자를 향하는 단면) 격자
  for (let x = 1; x <= 8; x++) {
    grid.push(line([x, 5, 0], [x, 5, 1], `frontPlateX${x}`));
  }
  for (let z = 1; z <= 6; z++) {
    grid.push(line([0, 5, z], [1, 5, z], `frontColZ${z}`));
  }

  // 핀 포인트 좌표
  const pin1 = p(0.5, 4.5, 7).split(',');
  const pin2 = p(6, 4.5, 1).split(',');

  return (
    <svg viewBox="0 0 620 430" fill="none" aria-hidden="true" className="w-full h-full">
      <defs>
        <pattern id="fem-grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" stroke="#d8e4f3" strokeWidth=".6" />
        </pattern>
        <linearGradient id="fem-top" x1="200" y1="80" x2="450" y2="350" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcecfd" />
        </linearGradient>
        <linearGradient id="fem-front" x1="170" y1="140" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e3effd" />
          <stop offset="1" stopColor="#bad9fc" />
        </linearGradient>
        <linearGradient id="fem-inner" x1="280" y1="90" x2="200" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bcdcfc" />
          <stop offset="1" stopColor="#9fcaf9" />
        </linearGradient>
      </defs>

      <rect width="620" height="430" fill="url(#fem-grid)" />
      <ellipse cx="320" cy="390" rx="190" ry="22" fill="#0b57c4" opacity=".06" />

      {/* 3D Solid L-Bracket Surfaces (정확한 5개 관측면) */}
      <g stroke="#3b82f6" strokeWidth="1.1" strokeLinejoin="round">
        {/* 기둥 안쪽 수직면 (X=1) */}
        <polygon
          points={[p(1, 0, 1), p(1, 5, 1), p(1, 5, 7), p(1, 0, 7)].join(' ')}
          fill="url(#fem-inner)"
        />

        {/* 바닥판 윗면 (Z=1) */}
        <polygon
          points={[p(1, 0, 1), p(9, 0, 1), p(9, 5, 1), p(1, 5, 1)].join(' ')}
          fill="url(#fem-top)"
        />

        {/* 기둥 윗면 캡 (Z=7) */}
        <polygon
          points={[p(0, 0, 7), p(1, 0, 7), p(1, 5, 7), p(0, 5, 7)].join(' ')}
          fill="#f4f9ff"
        />

        {/* 바닥판 우측 끝면 (X=9) */}
        <polygon
          points={[p(9, 0, 0), p(9, 5, 0), p(9, 5, 1), p(9, 0, 1)].join(' ')}
          fill="#9fcaf9"
        />

        {/* 정면 L자 앞면 (Y=5) */}
        <polygon
          points={[p(0, 5, 0), p(9, 5, 0), p(9, 5, 1), p(1, 5, 1), p(1, 5, 7), p(0, 5, 7)].join(' ')}
          fill="url(#fem-front)"
        />

        {/* 메쉬 요소 격자선 */}
        <g stroke="#2563eb" strokeWidth="0.8" opacity="0.85">
          {grid}
        </g>

        {/* 외곽선 강조 (Solid Edge Profile) */}
        <polyline
          points={[
            p(0, 5, 0),
            p(9, 5, 0),
            p(9, 0, 0),
            p(9, 0, 1),
            p(1, 0, 1),
            p(1, 0, 7),
            p(0, 0, 7),
            p(0, 5, 7),
            p(0, 5, 0),
          ].join(' ')}
          stroke="#1d4ed8"
          strokeWidth="1.3"
          fill="none"
        />
      </g>

      {/* 지시선 및 콜아웃 태그 */}
      <g stroke="#8da2bb" strokeWidth="1">
        <path d={`M ${pin1[0]} ${pin1[1]} H 106 V 104`} />
        <circle cx={pin1[0]} cy={pin1[1]} r="3" fill="#0066ff" stroke="white" strokeWidth="1.5" />
        <path d={`M ${pin2[0]} ${pin2[1]} H 500 V 291`} />
        <circle cx={pin2[0]} cy={pin2[1]} r="3" fill="#0066ff" stroke="white" strokeWidth="1.5" />
      </g>
      <g fontFamily="inherit" fontSize="11" fontWeight="600" fill="#476282">
        <text x="65" y="89">CAD → MESH</text>
        <text x="468" y="279">HEX / WEDGE / TET</text>
      </g>

      {/* 좌표계 축 표시 (X, Y, Z) */}
      <g transform="translate(55 354)" strokeWidth="2">
        <path d="M0 25 L24 35" stroke="#e67a7a" />
        <path d="M0 25 V-5" stroke="#6d9be0" />
        <path d="M0 25 L-18 37" stroke="#6ba98c" />
        <g fontFamily="inherit" fontSize="9" fontWeight="600" fill="#6d7d91">
          <text x="28" y="40">X</text>
          <text x="-4" y="-10">Z</text>
          <text x="-28" y="45">Y</text>
        </g>
      </g>
    </svg>
  );
}
