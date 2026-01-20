import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Debugging Listings ---');
  
  // 1. Count total listings
  const count = await prisma.listing.count();
  console.log(`Total Listings in DB: ${count}`);

  // 2. Fetch all listings with details
  const listings = await prisma.listing.findMany({
    include: {
        seller: {
            select: { username: true }
        }
    }
  });

  if (listings.length === 0) {
      console.log('No listings found.');
      return;
  }

  console.log('Listings:');
  listings.forEach(l => {
      console.log(`- [${l.id}] Title: "${l.title}" | Status: ${l.status} | Price: ${l.price} | Seller: ${l.seller?.username} (${l.sellerId}) | Created: ${l.createdAt}`);
      console.log(`  Expires: ${l.expiresAt}`);
      console.log(`  Category: ${l.category}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
