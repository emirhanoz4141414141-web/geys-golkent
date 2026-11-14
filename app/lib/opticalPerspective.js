/**
 * Dört köşesi belirlenmiş kâğıdın perspektif dönüşümü için homografi.
 * Köşe tespiti otomatik değildir: doğrulanmış dört nokta gerekir.
 * Giriş sırası: sol üst, sağ üst, sağ alt, sol alt.
 */
function solve8(matrix, values) {
  const a = matrix.map((row,i)=>[...row,values[i]])
  for(let col=0;col<8;col++){
    let pivot=col
    for(let row=col+1;row<8;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row
    if(Math.abs(a[pivot][col])<1e-9)throw new Error('Kâğıt köşeleri geçersiz veya aynı doğrultuda.')
    ;[a[col],a[pivot]]=[a[pivot],a[col]]
    const div=a[col][col]
    for(let j=col;j<=8;j++)a[col][j]/=div
    for(let row=0;row<8;row++)if(row!==col){
      const f=a[row][col]
      for(let j=col;j<=8;j++)a[row][j]-=f*a[col][j]
    }
  }
  return a.map(row=>row[8])
}
export function computeHomography(sourceCorners, targetCorners) {
  if (![sourceCorners,targetCorners].every(points=>Array.isArray(points)&&points.length===4&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)))) {
    throw new Error('Kaynak ve hedef için dört geçerli köşe gereklidir.')
  }
  const rows=[],values=[]
  for(let i=0;i<4;i++){
    const {x,y}=sourceCorners[i],{x:u,y:v}=targetCorners[i]
    rows.push([x,y,1,0,0,0,-u*x,-u*y])
    values.push(u)
    rows.push([0,0,0,x,y,1,-v*x,-v*y])
    values.push(v)
  }
  return [...solve8(rows,values),1]
}
export function mapHomography(matrix, point) {
  if(!Array.isArray(matrix)||matrix.length!==9||matrix.some(x=>!Number.isFinite(x))||
    !point||!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new Error('Perspektif parametreleri geçersiz.')
  const d=matrix[6]*point.x+matrix[7]*point.y+matrix[8]
  if(Math.abs(d)<1e-9)throw new Error('Perspektif dönüşümü tanımsız.')
  return {x:(matrix[0]*point.x+matrix[1]*point.y+matrix[2])/d,
    y:(matrix[3]*point.x+matrix[4]*point.y+matrix[5])/d}
}
export function mapPaperToImage(paperCorners, imageCorners, point) {
  return mapHomography(computeHomography(paperCorners,imageCorners),point)
}
