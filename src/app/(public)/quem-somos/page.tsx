import * as React from 'react'
import Image from 'next/image'
import { Award, Compass, Heart, ShieldCheck } from 'lucide-react'

export default function QuemSomosPage() {
  return (
    <div className="flex flex-col gap-10 py-4 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      <div className="text-center flex flex-col gap-2">
        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block">Estúdio NKS Art</span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          Nossa História & Design
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Nascido da paixão por sublimação, estamparia têxtil e identidades visuais de alta definição, 
          o NKS Art é uma centralizada biblioteca técnica focada em entregar arquivos de qualidade insuperável.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-slate-100 dark:border-slate-800 pt-8">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
          <Image
            src="https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&auto=format&fit=crop&q=80"
            alt="Designer working at studio"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-750 dark:bg-violet-950/30 dark:text-violet-400 rounded-full text-xs font-bold w-fit">
            <Compass className="h-3.5 w-3.5" /> Nosso Propósito
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50">
            Simplificar a Produção de Estampas
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Sabemos que no dia a dia das confecções e estamparias, o tempo é o recurso mais valioso. 
            Muitas vezes, arquivos mal catalogados, fontes sem acentos ou vetores cheios de nós soltos provocam atrasos graves.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            O NKS Art foi idealizado para ser o porto seguro do designer e impressor. Nossos arquivos passam por crivos técnicos de nós de curvatura, paleta de cores e fechamento final.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-center flex flex-col items-center gap-2.5">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full">
            <Award className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-50">Qualidade Curvas v1</h4>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Nossos vetores não contêm pixelizações ocultas. Tudo é gerado em curvas nativas editáveis.
          </p>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-center flex flex-col items-center gap-2.5">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-50">Segurança de Rede</h4>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Arquivos livres de vírus ou executáveis ocultos. Downloads puros em Cloudflare R2 com link pre-assinado.
          </p>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-center flex flex-col items-center gap-2.5">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full">
            <Heart className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-50">Produção Sustentável</h4>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Estampas fechadas corretamente evitam desperdício de tinta de sublimação e perdas de tecidos.
          </p>
        </div>
      </div>
    </div>
  )
}
