import './style.css'
export const metadata={
  title:'E-GÖLKENT | Eğitim ve Kurum Yönetim Sistemi',
  description:'Gölkent Erkek Yatılı Hafızlık Kur’an Kursu dijital eğitim ve yönetim platformu',
  applicationName:'E-GÖLKENT',
  icons:{icon:'/icons/e-golkent-192.webp',apple:'/icons/e-golkent-192.webp'},
  manifest:'/manifest.webmanifest'
}
export const viewport={themeColor:'#0b1f3a'}
export default function Layout({children}){return <html lang="tr"><body>{children}</body></html>}
