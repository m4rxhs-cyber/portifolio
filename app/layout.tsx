import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Neemias Sales | QA Portfolio',description:'Portfólio profissional de Neemias Sales — Quality Assurance, automação e engenharia de qualidade.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
