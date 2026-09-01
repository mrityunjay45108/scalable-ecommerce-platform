import {
  PrismaClient,
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  DiscountType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Create Permissions
  const permManageAll = await prisma.permission.create({
    data: {
      slug: '*:manage',
      name: 'Full Admin Access',
      description: 'Unrestricted access to all platform resources',
    },
  });

  const permProductsRead = await prisma.permission.create({
    data: {
      slug: 'products:read',
      name: 'Read Products',
      description: 'View products and catalog items',
    },
  });

  const permOrdersCreate = await prisma.permission.create({
    data: {
      slug: 'orders:create',
      name: 'Create Orders',
      description: 'Place orders and initiate checkout',
    },
  });

  // 3. Create Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'System Administrator with full permissions',
      permissions: {
        connect: [{ id: permManageAll.id }, { id: permProductsRead.id }, { id: permOrdersCreate.id }],
      },
    },
  });

  const customerRole = await prisma.role.create({
    data: {
      name: 'CUSTOMER',
      description: 'Registered customer with shopping permissions',
      permissions: {
        connect: [{ id: permProductsRead.id }, { id: permOrdersCreate.id }],
      },
    },
  });

  console.log('🛡️ Created RBAC Roles and Permissions.');

  // 4. Hash default password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 5. Create Admin & Customer Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@novastore.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Vance',
      role: UserRole.ADMIN,
      roleId: adminRole.id,
      isActive: true,
      isEmailVerified: true,
      phone: '+1 555-0199',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@novastore.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      role: UserRole.CUSTOMER,
      roleId: customerRole.id,
      isActive: true,
      isEmailVerified: true,
      phone: '+1 555-0144',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  console.log(`👤 Created users: Admin (${adminUser.email}), Customer (${customerUser.email})`);

  // 6. Create Addresses
  const defaultAddress = await prisma.address.create({
    data: {
      userId: customerUser.id,
      recipientName: 'Sarah Connor',
      phone: '+1 555-0144',
      street: '742 Cyberdyne Blvd, Suite 101',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
      isDefault: true,
    },
  });

  // 7. Create Categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Cutting-edge gadgets, audio gear, and personal devices.',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600',
    },
  });

  const audio = await prisma.category.create({
    data: {
      name: 'Audio & Headphones',
      slug: 'audio-headphones',
      description: 'Studio monitors, noise-canceling headphones, and wireless earbuds.',
      parentId: electronics.id,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    },
  });

  const apparel = await prisma.category.create({
    data: {
      name: 'Apparel & Fashion',
      slug: 'apparel-fashion',
      description: 'Contemporary clothing, premium footwear, and timeless accessories.',
      imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600',
    },
  });

  const footwear = await prisma.category.create({
    data: {
      name: 'Footwear',
      slug: 'footwear',
      description: 'Running sneakers, formal shoes, and urban street footwear.',
      parentId: apparel.id,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    },
  });

  const homeLiving = await prisma.category.create({
    data: {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Minimalist decor, smart lighting, and ergonomic furniture.',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600',
    },
  });

  console.log('📁 Created categories hierarchy.');

  // 8. Create Products, Variants, Images & Inventory
  // Product 1: Wireless ANC Headphones
  const headphones = await prisma.product.create({
    data: {
      title: 'Aura Pro Wireless Noise-Cancelling Headphones',
      slug: 'aura-pro-wireless-headphones',
      description:
        'Engineered with industry-leading hybrid active noise cancellation, custom 40mm beryllium drivers, 45-hour battery life, and ultra-plush memory foam earcups for unmatched acoustic clarity.',
      categoryId: audio.id,
      basePrice: 299.99,
      comparePrice: 349.99,
      isPublished: true,
      isFeatured: true,
      avgRating: 4.85,
      reviewCount: 2,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
            publicId: 'novastore/sample-headphones-1',
            altText: 'Aura Pro Headphones Matte Black',
            isPrimary: true,
            sortOrder: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800',
            publicId: 'novastore/sample-headphones-2',
            altText: 'Aura Pro Headphones Angle View',
            isPrimary: false,
            sortOrder: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'AURA-BLK-01',
            title: 'Midnight Black',
            price: 299.99,
            stockQuantity: 150,
            reservedStock: 2,
            attributes: { color: 'Midnight Black' },
            inventory: {
              create: {
                quantity: 150,
                reserved: 2,
                lowStockAlert: 15,
                location: 'MAIN_WAREHOUSE_A1',
              },
            },
          },
          {
            sku: 'AURA-SLV-01',
            title: 'Lunar Silver',
            price: 299.99,
            stockQuantity: 80,
            reservedStock: 0,
            attributes: { color: 'Lunar Silver' },
            inventory: {
              create: {
                quantity: 80,
                reserved: 0,
                lowStockAlert: 10,
                location: 'MAIN_WAREHOUSE_A2',
              },
            },
          },
        ],
      },
    },
  });

  // Product 2: Running Shoes
  const shoes = await prisma.product.create({
    data: {
      title: 'Apex Velocity Carbon Running Shoes',
      slug: 'apex-velocity-carbon-running-shoes',
      description:
        'Designed for marathoners and sprint athletes alike. Features a dual-density nitrogen-infused midsole, full-length carbon fiber propulsion plate, and breathable engineered mesh upper.',
      categoryId: footwear.id,
      basePrice: 179.99,
      comparePrice: 199.99,
      isPublished: true,
      isFeatured: true,
      avgRating: 4.9,
      reviewCount: 1,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
            publicId: 'novastore/sample-shoes-1',
            altText: 'Apex Velocity Crimson Red',
            isPrimary: true,
            sortOrder: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
            publicId: 'novastore/sample-shoes-2',
            altText: 'Apex Velocity Sole Detail',
            isPrimary: false,
            sortOrder: 1,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'APEX-RED-42',
            title: 'Crimson Red / US 9 (EU 42)',
            price: 179.99,
            stockQuantity: 45,
            reservedStock: 0,
            attributes: { color: 'Crimson Red', size: 'US 9' },
            inventory: {
              create: {
                quantity: 45,
                reserved: 0,
                lowStockAlert: 10,
                location: 'WEST_WAREHOUSE_B1',
              },
            },
          },
          {
            sku: 'APEX-RED-43',
            title: 'Crimson Red / US 10 (EU 43)',
            price: 179.99,
            stockQuantity: 60,
            reservedStock: 1,
            attributes: { color: 'Crimson Red', size: 'US 10' },
            inventory: {
              create: {
                quantity: 60,
                reserved: 1,
                lowStockAlert: 10,
                location: 'WEST_WAREHOUSE_B2',
              },
            },
          },
          {
            sku: 'APEX-BLK-42',
            title: 'Stealth Black / US 9 (EU 42)',
            price: 179.99,
            stockQuantity: 30,
            reservedStock: 0,
            attributes: { color: 'Stealth Black', size: 'US 9' },
            inventory: {
              create: {
                quantity: 30,
                reserved: 0,
                lowStockAlert: 5,
                location: 'WEST_WAREHOUSE_B3',
              },
            },
          },
        ],
      },
    },
  });

  // Product 3: Smart Desk Lamp
  const lamp = await prisma.product.create({
    data: {
      title: 'Lumina Smart Ergonomic Task Light',
      slug: 'lumina-smart-ergonomic-task-light',
      description:
        'Auto-dimming ambient sensor with circadian rhythm syncing, CRI 98 ultra-natural spectrum, USB-C 65W fast pass-through charging base, and precision CNC aluminum articulation.',
      categoryId: homeLiving.id,
      basePrice: 129.5,
      comparePrice: 149.0,
      isPublished: true,
      isFeatured: false,
      avgRating: 4.7,
      reviewCount: 0,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
            publicId: 'novastore/sample-lamp-1',
            altText: 'Lumina Task Light Minimalist Aluminum',
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'LUM-SLV-01',
            title: 'Anodized Space Gray',
            price: 129.5,
            stockQuantity: 75,
            reservedStock: 0,
            attributes: { finish: 'Space Gray' },
            inventory: {
              create: {
                quantity: 75,
                reserved: 0,
                lowStockAlert: 10,
                location: 'EAST_WAREHOUSE_C1',
              },
            },
          },
        ],
      },
    },
  });

  console.log('🛍️ Created products, variants, images, and inventory records.');

  // 9. Create Coupons
  const coupon1 = await prisma.coupon.create({
    data: {
      code: 'WELCOME20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderValue: 50,
      maxDiscount: 100,
      usageLimit: 500,
      usedCount: 1,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      isActive: true,
    },
  });

  const coupon2 = await prisma.coupon.create({
    data: {
      code: 'FLAT50',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50,
      minOrderValue: 200,
      usageLimit: 100,
      usedCount: 0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-12-31'),
      isActive: true,
    },
  });

  console.log('🎟️ Created coupons (WELCOME20, FLAT50).');

  // 10. Create Sample Reviews
  await prisma.review.create({
    data: {
      productId: headphones.id,
      userId: customerUser.id,
      rating: 5,
      title: 'Mind-blowing soundstage and comfort',
      comment:
        'The ANC is exceptional on flights, and battery easily lasts all week. Highly recommended for audiophiles and remote workers alike!',
      isApproved: true,
    },
  });

  // 11. Create Sample Order & Payment
  const sampleVariant = await prisma.productVariant.findFirst({
    where: { sku: 'AURA-BLK-01' },
  });

  if (sampleVariant) {
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026-98124',
        userId: customerUser.id,
        addressId: defaultAddress.id,
        subtotal: 299.99,
        tax: 24.0,
        shippingCost: 0.0,
        discountAmount: 59.99,
        totalAmount: 264.0,
        couponId: coupon1.id,
        status: OrderStatus.PROCESSING,
        trackingNumber: 'TRK-987654321-US',
        items: {
          create: [
            {
              variantId: sampleVariant.id,
              quantity: 1,
              unitPrice: 299.99,
              totalPrice: 299.99,
            },
          ],
        },
        payment: {
          create: {
            provider: PaymentProvider.STRIPE,
            transactionId: 'ch_3NMockChargeStripeDev123',
            paymentIntentId: 'pi_3NMockPaymentIntentDev123',
            amount: 264.0,
            currency: 'USD',
            status: PaymentStatus.CAPTURED,
          },
        },
      },
    });

    await prisma.couponUsage.create({
      data: {
        couponId: coupon1.id,
        userId: customerUser.id,
        orderId: order.id,
      },
    });

    console.log(`📦 Created sample order: ${order.orderNumber}`);
  }

  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
