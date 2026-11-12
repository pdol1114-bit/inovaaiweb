/** Original vector concept illustration; never represents a customer CAD or engine output. */
export function MeshConcept() {
  const p = (x: number, y: number, z: number) => `${285 + x * 23 - y * 18},${260 + x * 10 + y * 12 - z * 25}`;
  const line = (a: number[], b: number[], key: string) => <line key={key} x1={p(...a as [number, number, number]).split(',')[0]} y1={p(...a as [number, number, number]).split(',')[1]} x2={p(...b as [number, number, number]).split(',')[0]} y2={p(...b as [number, number, number]).split(',')[1]} />;
  const grid = [];
  for (let x = 0; x <= 9; x++) {
    grid.push(line([x,0,1],[x,5,1],`topx${x}`),line([x,0,0],[x,0,1],`front${x}`));
  }
  for (let y = 0; y <= 5; y++) {
    grid.push(line([0,y,1],[9,y,1],`topy${y}`),line([9,y,0],[9,y,1],`side${y}`));
    grid.push(line([0,y,7],[1,y,7],`cap${y}`),line([1,y,1],[1,y,7],`upright${y}`));
  }
  for (let z=1; z<=7; z++) grid.push(line([1,0,z],[1,5,z],`wall${z}`),line([0,0,z],[1,0,z],`edge${z}`));
  return <svg viewBox="0 0 620 430" fill="none" aria-hidden="true" className="w-full h-full">
    <defs>
      <pattern id="fem-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" stroke="#d8e4f3" strokeWidth=".6" /></pattern>
      <linearGradient id="fem-face" x1="200" y1="100" x2="440" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#f1f7ff"/><stop offset="1" stopColor="#c1dcff"/></linearGradient>
    </defs>
    <rect width="620" height="430" fill="url(#fem-grid)"/>
    <ellipse cx="322" cy="395" rx="200" ry="25" fill="#0b57c4" opacity=".05"/>
    <g stroke="#5391db" strokeWidth="1.1" strokeLinejoin="round">
      <polygon points={[p(0,0,0),p(9,0,0),p(9,5,0),p(0,5,0)].join(' ')} fill="#d2e6ff"/>
      <polygon points={[p(0,0,1),p(9,0,1),p(9,5,1),p(0,5,1)].join(' ')} fill="url(#fem-face)"/>
      <polygon points={[p(9,0,0),p(9,5,0),p(9,5,1),p(9,0,1)].join(' ')} fill="#a5c9f6"/>
      <polygon points={[p(0,0,0),p(9,0,0),p(9,0,1),p(0,0,1)].join(' ')} fill="#c0dafa"/>
      <polygon points={[p(0,0,1),p(0,5,1),p(0,5,7),p(0,0,7)].join(' ')} fill="#d4e7fc"/>
      <polygon points={[p(1,0,1),p(1,5,1),p(1,5,7),p(1,0,7)].join(' ')} fill="url(#fem-face)"/>
      <polygon points={[p(0,0,7),p(1,0,7),p(1,5,7),p(0,5,7)].join(' ')} fill="#f0f7ff"/>
      <polygon points={[p(0,0,1),p(1,0,1),p(1,0,7),p(0,0,7)].join(' ')} fill="#afcff7"/>
      <g opacity=".8">{grid}</g>
    </g>
    <g stroke="#94a9c3" strokeWidth="1"><path d="M 199 144 H 106 V 104"/><circle cx="199" cy="144" r="3" fill="#0066ff" stroke="white"/><path d="M 438 345 H 514 V 291"/><circle cx="438" cy="345" r="3" fill="#0066ff" stroke="white"/></g>
    <g fontFamily="monospace" fontSize="11" fill="#55708e"><text x="65" y="89">CAD → MESH</text><text x="482" y="279">HEX / WEDGE / TET</text></g>
    <g transform="translate(55 354)" strokeWidth="2"><path d="M0 25 H30" stroke="#e67a7a"/><path d="M0 25 V-5" stroke="#6d9be0"/><path d="M0 25 L-17 38" stroke="#6ba98c"/><g fontFamily="monospace" fontSize="9" fill="#6d7d91"><text x="35" y="28">X</text><text x="-3" y="-12">Z</text><text x="-26" y="49">Y</text></g></g>
  </svg>;
}
