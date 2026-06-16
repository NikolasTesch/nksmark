/**
 * Seed migration: create OrderItem records for existing Orders.
 *
 * Prior to this migration, each Order had a single artworkId directly on the row.
 * With the new OrderItem model, orders can have multiple items.
 * This script backfills an OrderItem for every existing Order that has artworkId set.
 *
 * Safe to run multiple times (idempotent — checks items.length === 0).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Looking for Orders with artworkId and no items...')

  const orders = await prisma.order.findMany({
    where: {
      artworkId: { not: null },
      items: { none: {} },
    },
  })

  console.log(`📦 Found ${orders.length} order(s) to migrate.`)

  if (orders.length === 0) {
    console.log('✅ Nothing to migrate — all orders already have items.')
    return
  }

  const items = orders.map((order) => ({
    orderId: order.id,
    artworkId: order.artworkId!,
    amountCents: order.amountCents,
  }))

  for (const item of items) {
    await prisma.orderItem.create({ data: item })
  }

  console.log(`✅ Created ${items.length} OrderItem(s) successfully.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
