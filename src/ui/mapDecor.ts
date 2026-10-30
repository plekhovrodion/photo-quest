// Оформление карты: деревья, кусты, холмы, камни, фонари, облака и искры в оттенках фона. Каждая сцена 120×120 «стоит» на нижней кромке.
const pine = (x: number, s = 1) => `<ellipse cx="${x}" cy="114" rx="${24 * s}" ry="${5 * s}" fill="#5b34c4" opacity=".45"/><rect x="${x - 4 * s}" y="${100 - 16 * s}" width="${8 * s}" height="${16 * s}" rx="2" fill="#5b34c4"/>
  <path d="M${x} ${110 - 96 * s}L${x + 22 * s} ${110 - 52 * s}H${x - 22 * s}Z" fill="#7a4fe8"/><path d="M${x} ${110 - 74 * s}L${x + 28 * s} ${110 - 26 * s}H${x - 28 * s}Z" fill="#6c42dc"/>`;
const round = (x: number, s = 1) => `<ellipse cx="${x}" cy="114" rx="${26 * s}" ry="${5 * s}" fill="#5b34c4" opacity=".45"/><rect x="${x - 4 * s}" y="${112 - 40 * s}" width="${8 * s}" height="${40 * s}" rx="3" fill="#6a3fd8"/>
  <circle cx="${x}" cy="${112 - 56 * s}" r="${28 * s}" fill="#a47fff"/><circle cx="${x - 8 * s}" cy="${112 - 64 * s}" r="${14 * s}" fill="#b496ff"/>`;
const bush = (x: number, s = 1) => `<ellipse cx="${x}" cy="${112 - 10 * s}" rx="${24 * s}" ry="${13 * s}" fill="#9a76ff"/><ellipse cx="${x - 14 * s}" cy="${112 - 8 * s}" rx="${14 * s}" ry="${10 * s}" fill="#a98aff"/><ellipse cx="${x + 15 * s}" cy="${112 - 7 * s}" rx="${13 * s}" ry="${9 * s}" fill="#8f69f5"/>`;
const hill = (x: number, s = 1) => `<path d="M${x - 36 * s} 114Q${x - 22 * s} ${114 - 46 * s} ${x} ${114 - 46 * s}Q${x + 22 * s} ${114 - 46 * s} ${x + 36 * s} 114Z" fill="#9a76ff"/><path d="M${x - 8 * s} 114Q${x + 6 * s} ${114 - 34 * s} ${x + 24 * s} ${114 - 30 * s}Q${x + 34 * s} ${114 - 24 * s} ${x + 36 * s} 114Z" fill="#8f69f5"/>`;
const rock = (x: number, s = 1) => `<ellipse cx="${x}" cy="114" rx="${22 * s}" ry="${4 * s}" fill="#5b34c4" opacity=".45"/><path d="M${x - 20 * s} 112Q${x - 22 * s} ${112 - 24 * s} ${x - 4 * s} ${112 - 28 * s}Q${x + 18 * s} ${112 - 28 * s} ${x + 20 * s} 112Z" fill="#7a4fe8"/><path d="M${x - 4 * s} ${112 - 28 * s}Q${x + 18 * s} ${112 - 28 * s} ${x + 20 * s} 112H${x + 4 * s}Q${x + 8 * s} ${112 - 16 * s} ${x - 4 * s} ${112 - 28 * s}Z" fill="#6c42dc"/>`;
const lamp = (x: number, s = 1) => `<ellipse cx="${x}" cy="114" rx="${12 * s}" ry="${3 * s}" fill="#5b34c4" opacity=".45"/><rect x="${x - 2.5 * s}" y="${114 - 64 * s}" width="${5 * s}" height="${64 * s}" rx="2" fill="#5b34c4"/>
  <circle cx="${x}" cy="${114 - 72 * s}" r="${16 * s}" fill="#ffe58a" opacity=".3"/><circle cx="${x}" cy="${114 - 72 * s}" r="${9 * s}" fill="#ffe58a"/>`;
const cloud = (x: number, y: number, s = 1) => `<g fill="#fff" opacity=".28"><circle cx="${x}" cy="${y}" r="${13 * s}"/><circle cx="${x + 16 * s}" cy="${y - 7 * s}" r="${16 * s}"/><circle cx="${x + 34 * s}" cy="${y}" r="${12 * s}"/><rect x="${x - 13 * s}" y="${y}" width="${59 * s}" height="${13 * s}" rx="${6 * s}"/></g>`;
const sparkle = (x: number, y: number, s = 1) => `<path d="M${x} ${y - 9 * s}Q${x + 1.5 * s} ${y - 1.5 * s} ${x + 9 * s} ${y}Q${x + 1.5 * s} ${y + 1.5 * s} ${x} ${y + 9 * s}Q${x - 1.5 * s} ${y + 1.5 * s} ${x - 9 * s} ${y}Q${x - 1.5 * s} ${y - 1.5 * s} ${x} ${y - 9 * s}Z" fill="#ffe58a"/>`;

const SCENES: string[] = [
  pine(30) + pine(72, 0.8) + pine(102, 0.55),
  cloud(22, 44) + cloud(64, 84, 0.7) + sparkle(100, 24) + sparkle(18, 96, 0.8),
  round(34) + bush(88) + round(108, 0.5),
  hill(36) + hill(92, 0.75) + sparkle(64, 26, 0.9) + sparkle(110, 52, 0.7),
  rock(36) + rock(78, 0.7) + bush(104, 0.55) + sparkle(24, 40, 0.8),
  pine(36, 1.1) + cloud(62, 34, 0.8) + bush(94, 0.8),
  bush(30) + lamp(62, 1.2) + bush(96, 0.85),
  round(40) + round(92, 0.75) + sparkle(104, 22),
];

export function mapDecor(i: number): string {
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${SCENES[i % SCENES.length]}</svg>`;
}
