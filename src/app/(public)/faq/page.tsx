'use client'

import * as React from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    question: 'Como faço para baixar os arquivos originais?',
    answer: 'Os downloads dos arquivos editáveis (nos formatos CDR, AI, PDF, OTF) são restritos a membros da nossa equipe interna homologados (role FASE). Se você pertence à equipe, faça login utilizando suas credenciais para liberar os botões de download direto.',
  },
  {
    question: 'Quais softwares são necessários para editar as artes?',
    answer: 'Nossos arquivos são distribuídos em formatos altamente compatíveis. Para arquivos com extensão .CDR, recomendamos o CorelDraw (versão X7 ou superior). Para arquivos .AI, indicamos o Adobe Illustrator. Arquivos .PDF podem ser editados em ambas as ferramentas ou importados na sua plotter de recorte.',
  },
  {
    question: 'Posso sugerir novos temas de estampas?',
    answer: 'Com certeza! Temos uma área dedicada chamada "Sugerir Arte" na barra de navegação. Preencha a descrição do tema que você necessita e nossa equipe de criação avaliará para incluir no cronograma de desenvolvimento semanal.',
  },
  {
    question: 'Onde vejo meu histórico de arquivos baixados?',
    answer: 'Todos os arquivos que você baixar ficarão registrados de forma automática na página "Meus Downloads" (acessível no menu superior após o login). Isso ajuda a encontrar rapidamente artes que você já utilizou em sua linha de produção.',
  },
  {
    question: 'Como funciona o suporte técnico em caso de arquivos corrompidos?',
    answer: 'Caso note qualquer falha ao extrair ou abrir algum arquivo, entre em contato conosco imediatamente através da aba "Suporte". Forneça seu email de contato e descreva a falha para que nosso suporte envie uma versão corrigida em tempo recorde.',
  }
]

export default function FAQPage() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className="flex flex-col gap-6 py-4 max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="text-center">
        <span className="nks-eyebrow">Dúvidas Frequentes</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl mt-3 mb-4 text-nks-black">
          FAQ
        </h1>
        <p className="text-sm text-nks-gray-700 max-w-lg mx-auto">
          Tire suas dúvidas rápidas sobre permissões de acesso, compatibilidade de formatos e como gerenciar seus downloads.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        {faqItems.map((item, idx) => {
          const isOpen = activeIndex === idx
          return (
            <div 
              key={idx}
              className="bg-white border border-nks-gray-200 rounded overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleAccordion(idx)}
                className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm sm:text-base text-nks-black hover:bg-nks-gray-100 transition-colors"
              >
                <span>{item.question}</span>
                <ChevronDown className={`h-4.5 w-4.5 text-nks-gray-400 transition-transform duration-300 shrink-0 ml-2 ${
                  isOpen ? 'rotate-180 text-nks-red' : 'rotate-0'
                }`} />
              </button>

              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? 'max-h-[300px] opacity-100 border-t border-nks-gray-200' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 text-xs sm:text-sm text-nks-gray-700 leading-relaxed bg-nks-gray-100/50">
                  {item.answer}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
