/** Code 39 baskı kodu; otomatik fotoğraf okuması bu aşamada yoktur. */
const PATTERNS={
'0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','*':'nwnnwnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn'
}
export function buildFormIdentity({examCode,studentNumber,pageNumber=1}){
 if(!/^[A-Z0-9-]{1,32}$/.test(examCode||'')||!/^[A-Z0-9-]{1,24}$/.test(studentNumber||'')||!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>5)return null
 // Uzunluk önekleri farklı kod birleşimlerinin çakışmasını engeller.
 return 'G'+String(examCode.length).padStart(2,'0')+examCode+'N'+String(studentNumber.length).padStart(2,'0')+studentNumber+'P'+pageNumber
}
/** Kayıt kimliğinden kısa baskı referansı üretir; eşsizliği garanti etmez.
 * Referans sadece yerel baskı içindir, öğrenci kaydı doğrulaması yerine geçmez.
 */
export function compactStudentReference(studentId){
 if(typeof studentId!=='string'||!studentId.trim())return null
 let h=0xcbf29ce484222325n
 for(const byte of new TextEncoder().encode(studentId)){
  h=(h^BigInt(byte))*0x100000001b3n & 0xffffffffffffffffn
 }
 return h.toString(36).toUpperCase().padStart(13,'0')
}
export function buildCompactFormIdentity({examCode,studentId,pageNumber=1}){
 if(!/^[A-Z0-9-]{1,32}$/.test(examCode||'')||!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>5)return null
 const ref=compactStudentReference(studentId)
 if(!ref)return null
 // ExamCode may be long; a short fingerprint keeps Code39 print legible.
 let h=0x811c9dc5
 for(const byte of new TextEncoder().encode(examCode)){h=Math.imul(h^byte,0x01000193)>>>0}
 return 'G'+h.toString(36).toUpperCase().padStart(7,'0')+ref+'P'+pageNumber
}
export function code39Bars(value){
 if(typeof value!=='string'||!value||value.length>30||![...value].every(ch=>PATTERNS[ch]&&ch!=='*'))return null
 let x=0;const bars=[]
 const symbols='*'+value+'*'
 for(let k=0;k<symbols.length;k++){
  if(k)x+=1
  for(let i=0;i<9;i++){const width=PATTERNS[symbols[k]][i]==='w'?3:1;if(i%2===0)bars.push({x,width});x+=width}
 }
 return {bars,width:x}
}
