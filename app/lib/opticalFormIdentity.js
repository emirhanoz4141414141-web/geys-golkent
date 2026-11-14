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
export function code39Bars(value){
 if(typeof value!=='string'||!value||![...value].every(ch=>PATTERNS[ch]&&ch!=='*'))return null
 let x=0;const bars=[]
 const symbols='*'+value+'*'
 for(let k=0;k<symbols.length;k++){
  if(k)x+=1
  for(let i=0;i<9;i++){const width=PATTERNS[symbols[k]][i]==='w'?3:1;if(i%2===0)bars.push({x,width});x+=width}
 }
 return {bars,width:x}
}
