export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(([firstLetter]) => firstLetter?.toUpperCase())
    .join('');
}
