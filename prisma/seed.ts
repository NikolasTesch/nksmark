import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial categories...')

  const categories = [
    { name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 1 },
    { name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
    { name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 3 },
    { name: 'Logos', slug: 'logos', color: '#f59e0b', showInFilter: true, filterOrder: 4 },
    { name: 'Outros', slug: 'outros', color: '#6b7280', showInFilter: true, filterOrder: 5 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        slug: cat.slug,
        color: cat.color,
        showInFilter: cat.showInFilter,
        filterOrder: cat.filterOrder,
      },
      create: cat,
    })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
