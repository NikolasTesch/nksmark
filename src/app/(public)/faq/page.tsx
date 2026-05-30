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
        <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-full w-fit mx-auto mb-4">
          <HelpCircle className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
          Perguntas Frequentes (FAQ)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Tire suas dúvidas rápidas sobre permissões de acesso, compatibilidade de formatos e como gerenciar seus downloads.
        </p>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        {faqItems.map((item, idx) => {
          const isOpen = activeIndex === idx
          return (
            <div 
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => toggleAccordion(idx)}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors"
              >
                <span>{item.question}</span>
                <ChevronDown className={`h-4.5 w-4.5 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${
                  isOpen ? 'rotate-180 text-primary' : 'rotate-0'
                }`} />
              </button>

              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? 'max-h-[300px] opacity-100 border-t border-slate-100 dark:border-slate-800' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 text-xs sm:text-sm text-slate-555 dark:text-slate-400 leading-relaxed bg-slate-50/30 dark:bg-slate-950/10">
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
