import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: PrismaService;
  let cartService: CartService;

  const mockProduct = {
    id: 'prod-10',
    title: 'Mechanical Gaming Keyboard',
    slug: 'mechanical-gaming-keyboard',
    basePrice: 129.99,
    comparePrice: 159.99,
    avgRating: 4.9,
    isPublished: true,
    deletedAt: null,
    category: { id: 'cat-1', name: 'Electronics' },
    images: [{ id: 'img-1', url: 'https://img.jpg', isPrimary: true, sortOrder: 0 }],
    variants: [
      {
        id: 'var-10',
        title: 'Cherry MX Red',
        stockQuantity: 15,
        reservedStock: 0,
        deletedAt: null,
      },
    ],
  };

  const mockWishlist = {
    id: 'wishlist-1',
    userId: 'user-1',
    items: [
      {
        id: 'item-1',
        wishlistId: 'wishlist-1',
        productId: 'prod-10',
        createdAt: new Date(),
        product: mockProduct,
      },
    ],
  };

  const mockPrismaService = {
    wishlist: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    wishlistItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockCartService = {
    addItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CartService, useValue: mockCartService },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    prisma = module.get<PrismaService>(PrismaService);
    cartService = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWishlist', () => {
    it('should return mapped wishlist items with inStock flag and numeric prices', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);

      const result = await service.getWishlist('user-1');

      expect(result.id).toBe('wishlist-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product.basePrice).toBe(129.99);
      expect(result.items[0].product.inStock).toBe(true);
    });
  });

  describe('toggleWishlist', () => {
    it('should add product if not currently in wishlist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);
      mockPrismaService.wishlistItem.findUnique.mockResolvedValue(null);

      const result = await service.toggleWishlist('user-1', 'prod-10');

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
        data: {
          wishlistId: 'wishlist-1',
          productId: 'prod-10',
        },
      });
      expect(result.added).toBe(true);
    });

    it('should remove product if already in wishlist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);
      mockPrismaService.wishlistItem.findUnique.mockResolvedValue({ id: 'item-1' });

      const result = await service.toggleWishlist('user-1', 'prod-10');

      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(result.added).toBe(false);
    });

    it('should throw NotFoundException if product is not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.toggleWishlist('user-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addToWishlist - Duplicate Prevention', () => {
    it('should not create duplicate entry if product is already in wishlist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);
      mockPrismaService.wishlistItem.findUnique.mockResolvedValue({ id: 'item-1' });

      await service.addToWishlist('user-1', 'prod-10');

      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });
  });

  describe('moveToCart', () => {
    it('should add variant to cart and remove item from wishlist', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);
      mockPrismaService.wishlistItem.findFirst.mockResolvedValue({ id: 'item-1' });
      mockCartService.addItem.mockResolvedValue({});

      const result = await service.moveToCart('user-1', 'prod-10');

      expect(cartService.addItem).toHaveBeenCalledWith('user-1', {
        variantId: 'var-10',
        quantity: 1,
      });
      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(result.message).toContain('moved to cart');
    });

    it('should throw BadRequestException if product has no active variants', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        ...mockProduct,
        variants: [],
      });

      await expect(service.moveToCart('user-1', 'prod-10')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('clearWishlist', () => {
    it('should delete all items belonging to user wishlist', async () => {
      mockPrismaService.wishlist.findUnique.mockResolvedValue(mockWishlist);

      const result = await service.clearWishlist('user-1');

      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { wishlistId: 'wishlist-1' },
      });
      expect(result.message).toContain('Wishlist cleared');
    });
  });
});
