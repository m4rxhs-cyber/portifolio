import type { Config } from 'tailwindcss';
export default {content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],theme:{extend:{colors:{ink:'#0d1114',panel:'#151b1f',line:'#2a3237',muted:'#9ba7ae',accent:'#e36b50'},fontFamily:{sans:['Arial','sans-serif'],mono:['Consolas','monospace']}}},plugins:[]} satisfies Config;
