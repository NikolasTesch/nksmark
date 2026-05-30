import * as React from 'react'
import Image from 'next/image'
import { Award, Compass, Heart, ShieldCheck } from 'lucide-react'

export default function QuemSomosPage() {
  return (
    <div className="flex flex-col gap-10 py-4 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      <div className="text-center flex flex-col gap-2">
        <span className="nks-eyebrow">Estúdio NKS Art</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-5xl text-nks-black mt-3 mb-4">
          Nossa História & Design
        </h1>
        <p className="text-sm sm:text-base text-nks-gray-700 max-w-2xl mx-auto leading-relaxed">
          Nascido da paixão por sublimação, estamparia têxtil e identidades visuais de alta definição, 
          o NKS Art é uma biblioteca técnica centralizada focada em entregar arquivos de qualidade insuperável.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-nks-gray-200 pt-8">
        <div className="relative aspect-[4/3] rounded overflow-hidden border border-nks-gray-200 bg-nks-gray-100">
          <Image
            src="https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=600&auto=format&fit=crop&q=80"
            alt="Designer trabalhando no estúdio"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-4">
          <span className="nks-eyebrow flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" /> Nosso Propósito
          </span>
          <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-2xl text-nks-black mt-2">
            Simplificar a Produção de Estampas
          </h2>
          <p className="text-sm text-nks-gray-700 leading-relaxed">
            Sabemos que no dia a dia das confecções e estamparias, o tempo é o recurso mais valioso. 
            Muitas vezes, arquivos mal catalogados, fontes sem acentos ou vetores cheios de nós soltos provocam atrasos graves.
          </p>
          <p className="text-sm text-nks-gray-900 leading-relaxed font-semibold">
            O NKS Art foi idealizado para ser o porto seguro do designer e impressor. Nossos arquivos passam por crivos técnicos de nós de curvatura, paleta de cores e fechamento final.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 border-t border-nks-gray-200">
        {[
          {
            icon: Award,
            title: 'Qualidade Curvas v1',
            body: 'Nossos vetores não contêm pixelizações ocultas. Tudo é gerado em curvas nativas editáveis.',
          },
          {
            icon: ShieldCheck,
            title: 'Segurança de Rede',
            body: 'Arquivos livres de vírus ou executáveis ocultos. Downloads puros em Cloudflare R2 com link pré-assinado.',
          },
          {
            icon: Heart,
            title: 'Produção Sustentável',
            body: 'Estampas fechadas corretamente evitam desperdício de tinta de sublimação e perdas de tecidos.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-3 p-6 bg-nks-gray-100 border border-nks-gray-200 rounded text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-nks-black text-white">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-[17px] text-nks-black">{title}</h3>
            <p className="text-sm text-nks-gray-700 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
