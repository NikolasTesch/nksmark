'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Award, Compass, Heart, ShieldCheck, Calendar, Zap, Sparkles, CheckCircle2 } from 'lucide-react'
import { motion, useInView, Variants } from 'framer-motion'

// Custom animated counter component that integrates with framer-motion viewport trigger
interface CounterProps {
  value: number
  suffix?: string
  duration?: number
}

function AnimatedCounter({ value, suffix = '', duration = 1.5 }: CounterProps) {
  const [count, setCount] = React.useState(0)
  const ref = React.useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  React.useEffect(() => {
    if (isInView) {
      let start = 0
      const end = value
      if (start === end) return

      const totalMiliseconds = duration * 1000
      const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 12)

      const timer = setInterval(() => {
        start += Math.ceil(end / (totalMiliseconds / incrementTime))
        if (start >= end) {
          setCount(end)
          clearInterval(timer)
        } else {
          setCount(start)
        }
      }, incrementTime)

      return () => clearInterval(timer)
    }
  }, [isInView, value, duration])

  return (
    <span ref={ref} className="font-display font-extrabold text-4xl sm:text-5xl text-white">
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  )
}

export function QuemSomosClient() {
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const isTimelineInView = useInView(timelineRef, { once: false, margin: '-100px' })

  // Animation variants with explicit type safety to prevent Next/TS compilation issues
  const fadeInVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.2, 0.6, 0.2, 1] as const }
    }
  }

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 220, damping: 20 }
    }
  }

  const timelineMilestones = [
    {
      year: '2021',
      title: 'A Centelha Criativa',
      description: 'Nascido da observação das dificuldades reais enfrentadas por confecções locais, iniciamos estudos e testes rigorosos de sublimação, estamparia e padronagem têxtil.',
      icon: Calendar,
      color: 'bg-nks-red'
    },
    {
      year: '2023',
      title: 'Engenharia de Curvas',
      description: 'Estabelecemos um padrão obsessivo de qualidade vetorial. Todas as artes criadas passaram a seguir regras estritas de fechamento de nós, paletas otimizadas para perfil de cores ICC e zero pixelização.',
      icon: Zap,
      color: 'bg-nks-black'
    },
    {
      year: '2025',
      title: 'Biblioteca NKS Art v1',
      description: 'Nascimento da plataforma centralizada. Uma biblioteca digital projetada para nossa equipe interna e parceiros homologados baixarem arquivos limpos e sem fraudes de rede.',
      icon: ShieldCheck,
      color: 'bg-nks-red'
    },
    {
      year: '2026',
      title: 'Expansão e Curadoria Técnica',
      description: 'Consolidação de um ecossistema digital focado em alta fidelidade. O designer e o impressor contam com arquivos pré-validados para produção imediata, sem desperdício de insumos.',
      icon: Sparkles,
      color: 'bg-nks-black'
    }
  ]

  return (
    <div className="flex flex-col gap-16 md:gap-24 py-4 w-full">
      
      {/* 1. HERO INTRO — Premium Dark Aesthetics */}
      <section className="relative overflow-hidden bg-nks-black rounded-lg border border-white/10 px-6 py-16 md:py-24 text-center flex flex-col items-center">
        {/* Decorative Grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-nks-red/10 rounded-full blur-[80px] pointer-events-none" />

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeInVariants}
          className="relative z-10 max-w-3xl flex flex-col items-center gap-4"
        >
          <span className="nks-eyebrow tracking-[0.2em] text-[12px] font-semibold text-nks-red-light">Estúdio NKS Art</span>
          
          <h1 className="font-display font-extrabold uppercase tracking-[-0.04em] leading-[1.02] text-4xl sm:text-6xl text-white mt-2">
            História, Engenharia <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-nks-red-light to-white">e Design de Alta Fidelidade</span>
          </h1>

          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 80 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="h-1 bg-nks-red rounded-full my-3"
          />

          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            Nascido da paixão por sublimação, estamparia têxtil e identidades visuais de alta definição, 
            o NKS Art é uma biblioteca técnica centralizada dedicada a entregar arquivos de qualidade insuperável.
          </p>
        </motion.div>
      </section>

      {/* 2. STATS OVERVIEW — Counting Stats */}
      <section className="bg-nks-black text-white py-10 rounded border border-white/5 shadow-nks px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-nks-red/5 to-transparent pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-1">
            <AnimatedCounter value={1240} suffix="+" />
            <span className="text-[11px] uppercase tracking-[0.1em] text-white/50 font-medium">Artes Homologadas</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-y md:border-y-0 md:border-x border-white/10 py-6 md:py-0">
            <AnimatedCounter value={6} suffix=" Categorias" />
            <span className="text-[11px] uppercase tracking-[0.1em] text-white/50 font-medium">Segmentação Técnica</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <AnimatedCounter value={100} suffix="%" />
            <span className="text-[11px] uppercase tracking-[0.1em] text-white/50 font-medium">Vetor Livre de Nós/Erros</span>
          </div>
        </div>
      </section>

      {/* 3. PROPÓSITO — Split Editorial Layout with Scroll Reveal */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center border-t border-nks-gray-200 pt-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInVariants}
          className="relative aspect-[4/3] rounded-lg overflow-hidden border border-nks-gray-200 shadow-nks bg-nks-gray-100 group"
        >
          <Image
            src="https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&auto=format&fit=crop&q=80"
            alt="Designer trabalhando no estúdio"
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Glowing frame overlay */}
          <div className="absolute inset-0 border border-black/10 group-hover:border-nks-red/20 transition-colors pointer-events-none" />
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInVariants}
          className="flex flex-col gap-4 text-left"
        >
          <span className="nks-eyebrow flex items-center gap-1.5 font-semibold">
            <Compass className="h-3.5 w-3.5 animate-pulse" /> Nosso Propósito
          </span>
          <h2 className="font-display font-extrabold uppercase tracking-[-0.02em] text-2xl sm:text-3xl text-nks-black mt-2">
            Simplificar a Produção e Evitar Perdas
          </h2>
          <p className="text-sm text-nks-gray-700 leading-relaxed">
            Sabemos que no dia a dia corrido das confecções e estamparias, o tempo é o recurso mais valioso. 
            Muitas vezes, arquivos mal catalogados, fontes sem caracteres acentuados ou vetores cheios de nós soltos provocam atrasos graves e desperdício de insumos.
          </p>
          <div className="p-4 bg-nks-gray-100 border-l-4 border-nks-red rounded-r-md">
            <p className="text-xs sm:text-sm text-nks-gray-900 leading-relaxed font-semibold flex items-start gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-nks-red shrink-0 mt-0.5" />
              O NKS Art foi idealizado para ser o porto seguro do designer e impressor. Nossos arquivos passam por rigorosos crivos de nós de curvatura, fechamento final e paleta de cores.
            </p>
          </div>
        </motion.div>
      </section>

      {/* 4. OS PILARES — Staggered Glassmorphic Value Cards */}
      <section className="flex flex-col gap-10 text-center border-t border-nks-gray-200 pt-12">
        <div>
          <span className="nks-eyebrow">Diferenciais Técnicos</span>
          <h2 className="font-display font-extrabold uppercase tracking-[-0.02em] text-2xl sm:text-3xl text-nks-black mt-2">
            Nossos Três Pilares Operacionais
          </h2>
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Award,
              title: 'Qualidade Curvas Perfeitas',
              body: 'Nossos vetores não contêm pixelizações ou máscaras de corte ocultas. Tudo é gerado em curvas nativas extremamente limpas e editáveis.',
              iconColor: 'text-nks-red',
              hoverEffect: { rotate: [0, -5, 5, 0] }
            },
            {
              icon: ShieldCheck,
              title: 'Segurança de Download',
              body: 'Arquivos livres de vírus ou executáveis maliciosos. Todos os downloads ocorrem via Cloudflare R2 de alta performance com links pré-assinados.',
              iconColor: 'text-nks-black',
              hoverEffect: { scale: [1, 1.15, 1] }
            },
            {
              icon: Heart,
              title: 'Sustentabilidade Têxtil',
              body: 'Estampas fechadas corretamente evitam desperdício crônico de tintas sublimáticas de alta densidade e perdas acidentais de tecidos nobres.',
              iconColor: 'text-nks-red',
              hoverEffect: { scale: [1, 1.2, 1] }
            },
          ].map(({ icon: Icon, title, body, iconColor, hoverEffect }) => (
            <motion.div 
              key={title} 
              variants={cardVariants}
              whileHover={{ 
                y: -6, 
                borderColor: 'var(--color-nks-red)',
                boxShadow: '0 8px 30px rgba(179, 18, 23, 0.08)'
              }}
              className="flex flex-col gap-3 p-6 bg-white border border-nks-gray-200 rounded-lg text-left transition-colors duration-200 group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded bg-nks-black text-white relative overflow-hidden">
                <motion.div whileHover={hoverEffect} className="relative z-10">
                  <Icon className="h-5 w-5" />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-tr from-nks-red to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
              </div>
              <h3 className="font-display font-bold text-lg text-nks-black mt-1 group-hover:text-nks-red transition-colors">{title}</h3>
              <p className="text-sm text-nks-gray-700 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 5. NOSSA EVOLUÇÃO — Interactive Animated Timeline */}
      <section ref={timelineRef} className="flex flex-col gap-12 border-t border-nks-gray-200 pt-12 relative">
        <div className="text-center">
          <span className="nks-eyebrow">Histórico do Estúdio</span>
          <h2 className="font-display font-extrabold uppercase tracking-[-0.02em] text-2xl sm:text-3xl text-nks-black mt-2">
            A Linha de Evolução do NKS Art
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto w-full px-4 sm:px-0 py-8">
          {/* Vertical central line with draw-down animation */}
          <motion.div 
            initial={{ height: 0 }}
            animate={isTimelineInView ? { height: '100%' } : { height: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-nks-gray-200 -translate-x-1/2 hidden sm:block"
          />

          <div className="flex flex-col gap-12">
            {timelineMilestones.map((milestone, idx) => {
              const isEven = idx % 2 === 0
              const MilestoneIcon = milestone.icon
              return (
                <div key={milestone.year} className={`flex flex-col sm:flex-row items-start ${isEven ? 'sm:flex-row-reverse' : ''} relative w-full`}>
                  {/* Outer dot spacer */}
                  <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 flex items-center justify-center z-10 top-0.5 sm:top-1/2 sm:-translate-y-1/2">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={isTimelineInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ delay: 0.15 * idx, type: 'spring' }}
                      className={`h-9 w-9 rounded-full ${milestone.color} text-white flex items-center justify-center border-4 border-white shadow-nks`}
                    >
                      <MilestoneIcon className="h-4 w-4" />
                    </motion.div>
                  </div>

                  {/* Left/Right Box spacing */}
                  <div className="w-full sm:w-1/2 pl-14 sm:pl-0 sm:px-8">
                    <motion.div 
                      initial={{ opacity: 0, x: isEven ? 30 : -30 }}
                      animate={isTimelineInView ? { opacity: 1, x: 0 } : { opacity: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 * idx }}
                      className="p-5 bg-nks-gray-100 border border-nks-gray-200 rounded-lg shadow-nks-sm relative group hover:border-nks-gray-400 transition-colors"
                    >
                      <span className="font-display font-extrabold text-lg text-nks-red block mb-1">
                        {milestone.year}
                      </span>
                      <h3 className="font-semibold text-base text-nks-black mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-nks-gray-700 leading-relaxed">
                        {milestone.description}
                      </p>
                    </motion.div>
                  </div>

                  {/* Empty side placeholder to balance layout on desktop */}
                  <div className="w-1/2 hidden sm:block" />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. CREATIVE PROCESS & CALL TO ACTION — Elegant editorial ending */}
      <section className="bg-nks-black text-white rounded-lg border border-white/10 px-6 py-12 md:py-16 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(179,18,23,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="flex-1 flex flex-col gap-4 text-left">
          <span className="nks-eyebrow text-nks-red-light font-semibold">Nosso Compromisso</span>
          <h2 className="font-display font-extrabold uppercase tracking-[-0.03em] text-2xl sm:text-3xl text-white">
            Desenvolvido por Profissionais, para Profissionais
          </h2>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            Cada linha de vetor, cada curva de Bézier e cada vetorização que catalogamos na biblioteca NKS Art passa por designers experientes que compreendem as restrições da prensa térmica e das impressoras plotter. Não entregamos arquivos genéricos de banco de imagens gratuito: entregamos soluções técnicas reais.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Link
              href="/loja"
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-nks-red px-6 text-xs font-semibold text-white transition-colors duration-[160ms] hover:bg-nks-red-dark w-fit"
            >
              Explorar Catálogo de Artes
            </Link>
          </div>
        </div>

        <div className="w-full md:w-2/5 flex justify-center">
          <div className="relative w-56 h-56 border border-white/10 rounded-full flex items-center justify-center">
            {/* Spinning decorative geometric outline */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="absolute inset-2 border-2 border-dashed border-white/5 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="absolute inset-6 border border-dotted border-nks-red/20 rounded-full"
            />
            
            <Image
              src="/icon.png"
              alt="Estúdio NKS Art"
              width={90}
              height={90}
              className="object-contain filter invert opacity-90 relative z-10"
              onError={(e) => {
                // Fallback in case icon.png is missing or has a different format
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      </section>

    </div>
  )
}
