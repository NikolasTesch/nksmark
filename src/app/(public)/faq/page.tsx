'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'

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

  // Animation variants for staggered accordion item entries
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 260, damping: 25 } 
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.6, 0.2, 1] }}
      className="flex flex-col gap-6 py-4 max-w-2xl mx-auto"
    >
      <div className="text-center">
        <span className="nks-eyebrow">Dúvidas Frequentes</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl mt-3 mb-4 text-nks-black">
          FAQ
        </h1>
        <p className="text-sm text-nks-gray-700 max-w-lg mx-auto">
          Tire suas dúvidas rápidas sobre permissões de acesso, compatibilidade de formatos e como gerenciar seus downloads.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 mt-6"
      >
        {faqItems.map((item, idx) => {
          const isOpen = activeIndex === idx
          return (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className="bg-white border border-nks-gray-200 rounded overflow-hidden shadow-nks-sm"
              whileHover={{ 
                borderColor: 'var(--color-nks-gray-400)',
                y: -1,
                transition: { duration: 0.12 }
              }}
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

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
                    className="overflow-hidden border-t border-nks-gray-200"
                  >
                    <div className="p-4 text-xs sm:text-sm text-nks-gray-700 leading-relaxed bg-nks-gray-100/50">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

