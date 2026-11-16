/**
 * 브라우저·서버 공용 사전 검사. CAD 형상은 검사하지 않는다(엔진이 한다).
 *
 * 지원 범위는 실제 엔진(inova_mesh)에 맞춘다:
 *  - 요소 전략: hex(Hex 우선 = hex8 + wedge6) / tet(Tet Only = tet4 100%) 둘뿐
 *  - 요소 차수: 1차만, 단위: mm만 (엔진은 단위 변환을 하지 않는다)
 *  - 업로드 한도: 엔진이 바이트 수를 int(50 × 1024 × 1024)와 비교하므로 52,428,800바이트(50 MiB)
 *  - 작업별 품질 목표값(Jacobian·Aspect Ratio)은 엔진에 없다 — 입력을 받지 않는다
 */
export const MAX_CAD_BYTES = 50 * 1024 * 1024;
export const MAX_ELEMENT_SIZE = 100000;
export const FIXED_UNIT = 'mm' as const;
export const FIXED_ORDER = 'linear' as const;
export const STRATEGIES = ['hex', 'tet'] as const;
export type Strategy = (typeof STRATEGIES)[number];
/** 화면에는 보이지만 선택할 수 없는 항목(엔진 미지원). */
export const UNSUPPORTED_STRATEGIES = ['mixed'] as const;
export const UNSUPPORTED_UNITS = ['cm', 'm'] as const;
export const UNSUPPORTED_ORDERS = ['quadratic'] as const;

export type CadSelection = { name: string; size: number; format: 'STEP' | 'BREP' };
export type SelectionError = 'fileCount' | 'fileType' | 'fileEmpty' | 'fileLarge';

export function inspectSelection(files: readonly { name: string; size: number }[]):
  { file: CadSelection; error?: never } | { file?: never; error: SelectionError } {
  if (files.length !== 1) return { error: 'fileCount' };
  const { name, size } = files[0];
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  if (!extension || !['step', 'stp', 'brep'].includes(extension)) return { error: 'fileType' };
  if (size === 0) return { error: 'fileEmpty' };
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_CAD_BYTES) return { error: 'fileLarge' };
  return { file: { name, size, format: extension === 'brep' ? 'BREP' : 'STEP' } };
}

/** 화면 입력 상태(문자열). 서버로는 `toEngineSettings`의 결과만 보낸다. */
export type MeshSettings = { size: string; strategy: Strategy };
export const DEFAULT_SETTINGS: MeshSettings = { size: '5', strategy: 'hex' };

export function validSettings(s: MeshSettings): boolean {
  return typeof s.size === 'string' && s.size.trim() !== '' && Number.isFinite(Number(s.size)) &&
    Number(s.size) > 0 && Number(s.size) <= MAX_ELEMENT_SIZE &&
    (STRATEGIES as readonly string[]).includes(s.strategy);
}

export type EngineSettings = { size: number; unit: 'mm'; strategy: Strategy; order: 'linear' };

/** 서버 측 재검증: 클라이언트가 보낸 임의의 값에서 허용된 설정만 만든다. 그 외는 null. */
export function parseEngineSettings(raw: unknown): EngineSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const size = typeof r.size === 'number' ? r.size : typeof r.size === 'string' && r.size.trim() !== '' ? Number(r.size) : NaN;
  if (!Number.isFinite(size) || size <= 0 || size > MAX_ELEMENT_SIZE) return null;
  if (typeof r.strategy !== 'string' || !(STRATEGIES as readonly string[]).includes(r.strategy)) return null;
  if (r.unit !== undefined && r.unit !== FIXED_UNIT) return null;
  if (r.order !== undefined && r.order !== FIXED_ORDER) return null;
  return { size, unit: FIXED_UNIT, strategy: r.strategy as Strategy, order: FIXED_ORDER };
}
