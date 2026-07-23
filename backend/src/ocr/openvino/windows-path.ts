export function toWindowsPath(linuxPath: string): string {
  const matched = linuxPath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!matched) throw new Error(`Windows NPU provider는 /mnt/<drive>/ 경로가 필요합니다: ${linuxPath}`);
  return `${matched[1].toUpperCase()}:/${matched[2]}`;
}
