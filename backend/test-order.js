const prisma = require('./src/config/prisma');

(async () => {
  try {
    const user = await prisma.user.findFirst({ where: { email: { startsWith: 'smoke.customer' } } });
    const restaurant = await prisma.restaurant.findFirst();
    const menuItem = await prisma.menuItem.findFirst({ where: { restaurantId: restaurant.id } });

    console.log('Testing with User:', user.id);
    console.log('Testing with Restaurant:', restaurant.id);
    console.log('Testing with MenuItem:', menuItem.id);

    const prismaOrderService = require('./src/services/prismaOrderService');
    const order = await prismaOrderService.createOrder({
      userId: user.id,
      restaurantId: restaurant.id,
      deliveryAddress: '123 Smoke Test St',
      items: [
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1
        }
      ]
    });
    console.log('Order created successfully:', order.id);
  } catch (e) {
    console.error('Order creation failed with error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
