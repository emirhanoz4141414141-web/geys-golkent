/**
 * Optik kâğıt köşeleri için geometrik güvenlik kontrolü.
 * Nokta sırası: sol üst, sağ üst, sağ alt, sol alt.
 * Görüntüden otomatik köşe bulmaz; yanlış elle seçimi reddeder.
 */
export function validatePaperCorners(points, { minArea = 100 } = {}) {
  if (!Array.isArray(points) || points.length !== 4 ||
      points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) ||
      !Number.isFinite(minArea) || minArea <= 0) {
    return { valid: false, reason: 'invalid_points' }
  }
  const cross = (a,b,c) => (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)
  const turns = points.map((p,i) => cross(p,points[(i+1)%4],points[(i+2)%4]))
  if (turns.some(t => Math.abs(t) < 1e-7) ||
      !turns.every(t => t > 0) && !turns.every(t => t < 0)) {
    return { valid: false, reason: 'crossed_or_concave' }
  }
  const area = Math.abs(points.reduce((sum,p,i) => {
    const next=points[(i+1)%4]
    return sum+p.x*next.y-next.x*p.y
  },0))/2
  if (area < minArea) return { valid: false, reason: 'too_small' }
  return { valid: true, area }
}
