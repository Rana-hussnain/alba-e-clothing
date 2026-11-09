import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const KID_SIZES = JSON.stringify(['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y']);
const MEN_SIZES = JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']);
const BELT_SIZES = JSON.stringify(['32', '34', '36', '38', '40']);

const products = [
  // ================= MEN =================
  {
    slug: 'men-t-shirt',
    name: 'Relaxed-Fit Cotton T-Shirt',
    category: 'men',
    subtype: 'T-Shirts',
    description:
      'A wardrobe essential cut from soft, breathable combed cotton. The relaxed fit and ribbed crew neckline make it easy to layer or wear on its own all summer long.',
    price: 1299,
    image: '/products/men-t-shirt.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Black', 'White', 'Navy']),
    featured: true,
  },
  {
    slug: 'men-trousers',
    name: 'Tailored Summer Trousers',
    category: 'men',
    subtype: 'Trousers',
    description:
      'Lightweight tailored trousers with a pleated front and a clean drape. Designed for warm days, they pair effortlessly with shirts and polos for a sharp look.',
    price: 2199,
    image: '/products/men-trousers.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Beige', 'Stone', 'Olive']),
    featured: true,
  },
  {
    slug: 'men-cotton-pants',
    name: 'Straight-Fit Cotton Pants',
    category: 'men',
    subtype: 'Cotton Pants',
    description:
      'Everyday chinos in durable cotton twill with a straight leg and mid rise. Finished with slant pockets and a garment-dyed surface for a lived-in feel.',
    price: 1999,
    image: '/products/men-cotton-pants.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Stone Beige', 'Black', 'Sage']),
    featured: false,
  },
  {
    slug: 'men-baggy-jeans',
    name: 'Baggy-Fit Light Wash Jeans',
    category: 'men',
    subtype: 'Jeans',
    description:
      'Loose, street-ready baggy jeans in a light indigo wash with subtle whiskering. Rigid denim softens with wear for a personalised fit.',
    price: 2999,
    image: '/products/men-baggy-jeans.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Light Blue']),
    featured: true,
  },
  {
    slug: 'men-regular-jeans',
    name: 'Regular-Fit Straight Jeans',
    category: 'men',
    subtype: 'Jeans',
    description:
      'The classic five-pocket jean in dark indigo with a regular straight leg. A timeless cut that works with everything from tees to blazers.',
    price: 3199,
    image: '/products/men-regular-jeans.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Dark Indigo', 'Mid Blue']),
    featured: false,
  },
  {
    slug: 'men-slimfit-jeans',
    name: 'Slim-Fit Stretch Jeans',
    category: 'men',
    subtype: 'Jeans',
    description:
      'Streamlined slim-fit jeans with just the right amount of stretch. Clean dark hardware and a tapered leg for a modern silhouette.',
    price: 3499,
    image: '/products/men-slimfit-jeans.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Mid Blue', 'Black']),
    featured: true,
  },
  {
    slug: 'men-cargo-trousers',
    name: 'Utility Cargo Trousers',
    category: 'men',
    subtype: 'Cargo Trousers',
    description:
      'Functional cargo trousers with bellowed side pockets, reinforced seams and an adjustable hem. Built for movement, styled for the city.',
    price: 2499,
    image: '/products/men-cargo-trousers.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Olive', 'Black', 'Khaki']),
    featured: false,
  },
  {
    slug: 'men-casual-shirt',
    name: 'Striped Casual Shirt',
    category: 'men',
    subtype: 'Casual Shirts',
    description:
      'A breathable striped shirt in yarn-dyed cotton with a soft point collar. Wear it buttoned up for smart occasions or open over a tee.',
    price: 2299,
    image: '/products/men-casual-shirt.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Light Blue', 'White']),
    featured: false,
  },
  {
    slug: 'men-sweatshirt',
    name: 'Crew-Neck Sweatshirt',
    category: 'men',
    subtype: 'Sweatshirts',
    description:
      'Brushed-back fleece sweatshirt with ribbed trims and a clean crew neckline. Cosy enough for evenings, minimal enough for anywhere.',
    price: 2799,
    image: '/products/men-sweatshirt.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Heather Grey', 'Navy']),
    featured: false,
  },
  {
    slug: 'men-hoodie',
    name: 'Essential Drawstring Hoodie',
    category: 'men',
    subtype: 'Hoodies',
    description:
      'Heavyweight cotton-blend hoodie with a double-layer hood, kangaroo pocket and flat drawcords. The everyday layer you will reach for first.',
    price: 2999,
    image: '/products/men-hoodie.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Black', 'Grey', 'Navy']),
    featured: true,
  },
  {
    slug: 'men-leather-belt',
    name: 'Genuine Leather Belt',
    category: 'men',
    subtype: 'Leather Belts',
    description:
      'A full-grain leather belt with a brushed silver pin buckle. Hand-finished edges and a slim 3.5 cm strap that dresses up or down.',
    price: 1199,
    image: '/products/men-leather-belt.png',
    sizes: BELT_SIZES,
    colors: JSON.stringify(['Brown', 'Black']),
    featured: false,
  },
  {
    slug: 'men-baggy-trousers',
    name: 'Wide-Leg Baggy Trousers',
    category: 'men',
    subtype: 'Baggy Trousers',
    description:
      'Relaxed wide-leg trousers in a fluid cotton blend with a high-rise waist. An easy statement piece with sneakers or loafers.',
    price: 2399,
    image: '/products/men-baggy-trousers.png',
    sizes: MEN_SIZES,
    colors: JSON.stringify(['Beige', 'Black']),
    featured: false,
  },

  // ================= KIDS =================
  {
    slug: 'kids-t-shirt',
    name: 'Kids Striped Cotton T-Shirt',
    category: 'kids',
    subtype: 'T-Shirts',
    description:
      'Playful stripes on 100% skin-friendly cotton. Soft-washed for comfort with a tag-free neckline that keeps kids happy all day.',
    price: 999,
    image: '/products/kids-t-shirt.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Multi', 'White', 'Navy']),
    featured: true,
  },
  {
    slug: 'kids-trousers',
    name: 'Kids Comfort Trousers',
    category: 'kids',
    subtype: 'Trousers',
    description:
      'Easy-wear trousers in a soft cotton blend with an elasticated back waist. Tough enough for playtime, smart enough for school.',
    price: 1499,
    image: '/products/kids-trousers.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Khaki', 'Navy']),
    featured: false,
  },
  {
    slug: 'kids-cotton-pants',
    name: 'Kids Soft Cotton Pants',
    category: 'kids',
    subtype: 'Cotton Pants',
    description:
      'Gently tapered pants brushed on the inside for extra softness. Adjustable drawcord waist grows with your child.',
    price: 1299,
    image: '/products/kids-cotton-pants.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Beige', 'Grey']),
    featured: false,
  },
  {
    slug: 'kids-baggy-jeans',
    name: 'Kids Baggy-Fit Jeans',
    category: 'kids',
    subtype: 'Jeans',
    description:
      'Trend-led baggy jeans in a soft light-wash denim with an elasticated waistband. Built-in comfort for playground pros.',
    price: 1899,
    image: '/products/kids-baggy-jeans.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Light Blue']),
    featured: false,
  },
  {
    slug: 'kids-regular-jeans',
    name: 'Kids Regular-Fit Jeans',
    category: 'kids',
    subtype: 'Jeans',
    description:
      'The everyday classic: five pockets, a straight leg and an adjustable waist in durable stretch denim that keeps its shape.',
    price: 1999,
    image: '/products/kids-regular-jeans.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Indigo']),
    featured: false,
  },
  {
    slug: 'kids-slimfit-jeans',
    name: 'Kids Slim-Fit Jeans',
    category: 'kids',
    subtype: 'Jeans',
    description:
      'Sleek slim-fit jeans with extra flex for running, climbing and everything in between. Pull-on style with a button detail.',
    price: 2199,
    image: '/products/kids-slimfit-jeans.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Mid Blue']),
    featured: false,
  },
  {
    slug: 'kids-cargo-trousers',
    name: 'Kids Cargo Trousers',
    category: 'kids',
    subtype: 'Cargo Trousers',
    description:
      'Adventure-ready cargos with roomy cargo pockets and a comfy elastic waist. Ripstop cotton blend handles rough and tumble.',
    price: 1699,
    image: '/products/kids-cargo-trousers.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Olive', 'Khaki']),
    featured: false,
  },
  {
    slug: 'kids-casual-shirt',
    name: 'Kids Check Casual Shirt',
    category: 'kids',
    subtype: 'Casual Shirts',
    description:
      'A cheerful gingham check shirt in breathable cotton with a button-front and rounded hem. Looks great open or buttoned.',
    price: 1499,
    image: '/products/kids-casual-shirt.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Light Check', 'White']),
    featured: false,
  },
  {
    slug: 'kids-sweatshirt',
    name: 'Kids Crew-Neck Sweatshirt',
    category: 'kids',
    subtype: 'Sweatshirts',
    description:
      'A cosy everyday sweatshirt in soft fleece with ribbed cuffs. Pairs with everything from jeans to joggers.',
    price: 1799,
    image: '/products/kids-sweatshirt.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Heather Grey', 'Navy']),
    featured: false,
  },
  {
    slug: 'kids-hoodie',
    name: 'Kids Cosy Hoodie',
    category: 'kids',
    subtype: 'Hoodies',
    description:
      'A snug fleece-lined hoodie with a jersey-lined hood and front pouch pocket. Their new favourite layer for cool days.',
    price: 1999,
    image: '/products/kids-hoodie.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Navy', 'Grey']),
    featured: true,
  },
  {
    slug: 'kids-baggy-trousers',
    name: 'Kids Baggy Trousers',
    category: 'kids',
    subtype: 'Baggy Trousers',
    description:
      'Wide-leg baggy trousers with an easy elastic waist and soft drape. Street-style comfort sized for mini trendsetters.',
    price: 1599,
    image: '/products/kids-baggy-trousers.png',
    sizes: KID_SIZES,
    colors: JSON.stringify(['Beige', 'Black']),
    featured: false,
  },
];

async function main() {
  // Only seed an empty database, so products you edited or deleted in the admin panel are never brought back.
  // Use `npm run db:seed -- --force` to add any missing default products anyway.
  const existing = await db.product.count();
  if (existing > 0 && !process.argv.includes('--force')) {
    console.log(`Products already in the database (${existing}) — skipping seed.`);
    return;
  }
  for (const p of products) {
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  const count = await db.product.count();
  console.log(`Seeded. Total products: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
