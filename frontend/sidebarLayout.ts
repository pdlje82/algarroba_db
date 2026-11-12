export const DEFAULT_INSPECTOR_WIDTH = 360;
export function inspectorLimits(viewportWidth: number) {
  return {min: 300, max: Math.max(300, Math.min(720, (viewportWidth - (viewportWidth >= 1200 ? 260 : 0)) / 2))};
}
export function inspectorWidth(preferred: number, viewportWidth: number) {
  const {min, max} = inspectorLimits(viewportWidth);
  return Math.max(min, Math.min(max, preferred));
}
