import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
// Self-hosted variable fonts (no build-time network dependency).
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorker } from '@/components/service-worker';

export const metadata:Metadata={title:{default:'Quill — Trading & Life Journal',template:'%s · Quill'},description:'A private trading and life journal with behavioural intelligence.',applicationName:'Quill',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Quill'}};
export const viewport:Viewport={themeColor:[{media:'(prefers-color-scheme:light)',color:'#f7f6f2'},{media:'(prefers-color-scheme:dark)',color:'#0c0d10'}],width:'device-width',initialScale:1,viewportFit:'cover'};
const themeBoot=`(function(){try{var t=localStorage.getItem('quill-theme');if(!t)t='dark';var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;
export default function RootLayout({children}:{children:ReactNode}){return <html lang='en' suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBoot}}/></head><body className='font-sans antialiased'><Providers><ServiceWorker/>{children}</Providers></body></html>}
