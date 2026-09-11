import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorker } from '@/components/service-worker';

const jakarta=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-jakarta',display:'swap',weight:['400','500','600','700']});
const inter=Inter({subsets:['latin'],variable:'--font-inter',display:'swap'});
const spaceGrotesk=Space_Grotesk({subsets:['latin'],variable:'--font-display-sg',display:'swap'});
const jetbrains=JetBrains_Mono({subsets:['latin'],variable:'--font-jb',display:'swap'});

export const metadata:Metadata={title:{default:'Quill — Trading & Life Journal',template:'%s · Quill'},description:'A private trading and life journal with behavioural intelligence.',applicationName:'Quill',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Quill'}};
export const viewport:Viewport={themeColor:[{media:'(prefers-color-scheme:light)',color:'#f8f6f1'},{media:'(prefers-color-scheme:dark)',color:'#0d0f12'}],width:'device-width',initialScale:1,viewportFit:'cover'};
const themeBoot=`(function(){try{var t=localStorage.getItem('quill-theme');if(!t)t='dark';var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;
export default function RootLayout({children}:{children:ReactNode}){return <html lang='en' suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBoot}}/></head><body className={`${jakarta.variable} ${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} themed font-sans antialiased`}><Providers><ServiceWorker/>{children}</Providers></body></html>}
