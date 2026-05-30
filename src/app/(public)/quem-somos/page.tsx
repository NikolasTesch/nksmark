import { Metadata } from 'next'
import { QuemSomosClient } from './QuemSomosClient'

export const metadata: Metadata = {
  title: 'Quem Somos — Nossa História, Métricas & Design de Alta Fidelidade',
  description: 'Saiba como nasceu o NKS Art, nossa engenharia obsessiva de curvas vetoriais em CorelDraw e Illustrator, e nosso compromisso técnico com confecções e sublimação de alta resolução.',
  keywords: ['quem somos nks', 'estúdio nks art', 'história nks art', 'sublimação de alta fidelidade', 'vetores em curvas', 'fechamento de arquivo'],
}

export default function QuemSomosPage() {
  return <QuemSomosClient />
}
