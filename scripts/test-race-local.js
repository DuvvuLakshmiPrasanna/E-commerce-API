const prisma = require('../src/config/database');
const OrderService = require('../src/services/OrderService');
const UserRepository = require('../src/repositories/UserRepository');
const CartRepository = require('../src/repositories/CartRepository');
const CartService = require('../src/services/CartService');

async function seed() {
  // Clean up
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();

  // Create a product with stock 1
  const product = await prisma.product.create({
    data: {
      name: 'Race Test Product',
      price: 9.99,
      stockQuantity: 1,
      version: 1,
      category: 'test',
      description: 'Product for race test',
    },
  });

  // Create two users and carts with one item each
  const userA = await prisma.user.create({ data: { name: 'User A', email: 'a@example.com', password: 'x' } });
  const userB = await prisma.user.create({ data: { name: 'User B', email: 'b@example.com', password: 'x' } });

  const cartA = await prisma.cart.create({ data: { userId: userA.id } });
  const cartB = await prisma.cart.create({ data: { userId: userB.id } });

  await prisma.cartItem.create({ data: { cartId: cartA.id, productId: product.id, quantity: 1 } });
  await prisma.cartItem.create({ data: { cartId: cartB.id, productId: product.id, quantity: 1 } });

  return { product, userA, userB };
}

async function runRace() {
  console.log('Seeding database...');
  const { product, userA, userB } = await seed();
  console.log('Seeded product id:', product.id);

  // Run two concurrent createOrder calls
  console.log('Starting two concurrent checkouts...');
  const p1 = OrderService.createOrder(userA.id).then(
    (order) => ({ ok: true, order, who: 'A' }),
    (err) => ({ ok: false, error: err.message || err, who: 'A' })
  );
  const p2 = OrderService.createOrder(userB.id).then(
    (order) => ({ ok: true, order, who: 'B' }),
    (err) => ({ ok: false, error: err.message || err, who: 'B' })
  );

  const results = await Promise.all([p1, p2]);
  console.log('Results:');
  console.dir(results, { depth: 4 });

  // Show final product state
  const final = await prisma.product.findUnique({ where: { id: product.id } });
  console.log('Final product:', final);

  // Show all orders
  const orders = await prisma.order.findMany({ include: { items: true } });
  console.log('Orders in DB:', orders.length);
  console.dir(orders, { depth: 4 });

  await prisma.$disconnect();
}

runRace().catch((err) => {
  console.error('Error running race test:', err);
  prisma.$disconnect();
  process.exit(1);
});
