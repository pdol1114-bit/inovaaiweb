/** Browser-only preflight. This does not validate CAD geometry or call an engine. */
export const MAX_CAD_BYTES = 100 * 1024 * 1024;
export type CadSelection = { name: string; size: number; format: 'STEP' | 'BREP' };
export type SelectionError = 'fileCount' | 'fileType' | 'fileEmpty' | 'fileLarge';
export function inspectSelection(files: readonly { name: string; size: number }[]):
  { file: CadSelection; error?: never } | { file?: never; error: SelectionError } {
  if (files.length !== 1) return { error: 'fileCount' };
  const { name, size } = files[0];
  const extension = name.split('.').pop()?.toLowerCase();
  if (!extension || !['step', 'stp', 'brep'].includes(extension)) return { error: 'fileType' };
  if (size === 0) return { error: 'fileEmpty' };
  if (!Number.isFinite(size) || size > MAX_CAD_BYTES) return { error: 'fileLarge' };
  return { file: { name, size, format: extension === 'brep' ? 'BREP' : 'STEP' } };
}
export type MeshSettings = {
  size: string; unit: 'mm' | 'cm' | 'm'; strategy: 'hex' | 'mixed' | 'tet';
  order: 'linear' | 'quadratic'; jacobian: string; aspect: string;
};
export const DEFAULT_SETTINGS: MeshSettings = {
  size: '5', unit: 'mm', strategy: 'hex', order: 'linear', jacobian: '0.2', aspect: '10',
};
export function validSettings(s: MeshSettings): boolean {
  return s.size.trim() !== '' && Number.isFinite(Number(s.size)) && Number(s.size) > 0 && Number(s.size) <= 100000 &&
    s.jacobian.trim() !== '' && Number.isFinite(Number(s.jacobian)) && Number(s.jacobian) > 0 && Number(s.jacobian) <= 1 &&
    s.aspect.trim() !== '' && Number.isFinite(Number(s.aspect)) && Number(s.aspect) >= 1 && Number(s.aspect) <= 1000 &&
    ['mm','cm','m'].includes(s.unit) && ['hex','mixed','tet'].includes(s.strategy) && ['linear','quadratic'].includes(s.order);
}
