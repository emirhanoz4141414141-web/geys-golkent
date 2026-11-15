/**
 * Kamera/tuval RGBA piksellerinden optik kabarcık doluluk tahmini.
 * Görüntü hizalama bu katmana gelmeden önce yapılmış olmalıdır.
 * Ham görüntü veya öğrenci verisi gönderilmez, saklanmaz.
 */
export function measureBubbleFill(image, circle, options = {}) {
  const { data, width, height } = image || {}
  const { x, y, radius } = circle || {}
  const darknessCutoff = options.darknessCutoff ?? 0.48
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      !data || data.length !== width * height * 4 ||
      ![x,y,radius].every(Number.isFinite) || radius < 3 ||
      x-radius < 0 || y-radius < 0 || x+radius >= width || y+radius >= height ||
      !Number.isFinite(darknessCutoff) || darknessCutoff <= 0 || darknessCutoff >= 1) {
    throw new Error('Optik örnekleme için geçerli RGBA görüntüsü ve kabarcık koordinatı gereklidir.')
  }
  // Aydınlatma fotoğraf boyunca değişebilir. Her baloncuğun hemen
  // çevresindeki kâğıt parlaklığını ayrı ölç; baskı konturunu dışla.
  const reference = []
  for (let py=Math.ceil(y-radius*1.55);py<=Math.floor(y+radius*1.55);py++) {
    for(let px=Math.ceil(x-radius*1.55);px<=Math.floor(x+radius*1.55);px++){
      if(px<0||py<0||px>=width||py>=height)continue
      const d=Math.hypot(px-x,py-y)
      if(d<radius*1.17||d>radius*1.50)continue
      const k=(py*width+px)*4
      if(data[k+3]<250)throw new Error('Saydam görüntü optik değerlendirmeye uygun değil.')
      reference.push((.2126*data[k]+.7152*data[k+1]+.0722*data[k+2])/255)
    }
  }
  reference.sort((a,b)=>a-b)
  const background=reference.length>=8?reference[Math.floor(reference.length*.65)]:null
  // Mutlak eşik karanlık çekimlerde işareti kaçırıyordu. Yerel eşik,
  // kâğıda göre en az %16 koyu pikselleri işaret kabul eder.
  // Önceki Math.min(.48, ...) gri kalem işaretlerini yanlışlıkla boş sayıyordu.
  const threshold=background===null?darknessCutoff:Math.max(.08,Math.min(.85,background-.16))
  const innerRadius = radius * 0.55
  let dark = 0, sampled = 0
  for (let py = Math.ceil(y-innerRadius); py <= Math.floor(y+innerRadius); py++) {
    for (let px = Math.ceil(x-innerRadius); px <= Math.floor(x+innerRadius); px++) {
      if ((px-x)**2 + (py-y)**2 > innerRadius**2) continue
      const offset = (py*width+px)*4
      const alpha = data[offset+3] / 255
      if (alpha < 0.98) throw new Error('Saydam görüntü optik değerlendirmeye uygun değil.')
      const brightness = (0.2126*data[offset] + 0.7152*data[offset+1] + 0.0722*data[offset+2])/255
      if (brightness < threshold) dark++
      sampled++
    }
  }
  if (!sampled) throw new Error('Örnekleme alanı boş.')
  return { fill: dark/sampled, sampledPixels: sampled }
}

export function measureOpticalRow(image, circles, options) {
  if (!Array.isArray(circles) || circles.length !== 4) {
    throw new Error('Her soru için dört kabarcık koordinatı gereklidir.')
  }
  return circles.map(circle => measureBubbleFill(image,circle,options).fill)
}
