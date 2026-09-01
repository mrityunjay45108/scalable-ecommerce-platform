import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService - Address Management', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockAddress = {
    id: 'addr-1',
    userId: 'user-1',
    recipientName: 'Jane Doe',
    phone: '+15551234567',
    street: '123 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'US',
    isDefault: true,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Address CRUD', () => {
    it('should list all addresses for user with default first', async () => {
      mockPrismaService.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.getAddresses('user-1');

      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { isDefault: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should create new address and set as default if first address', async () => {
      mockPrismaService.address.count.mockResolvedValue(0);
      mockPrismaService.address.create.mockResolvedValue(mockAddress);

      const dto = {
        recipientName: 'Jane Doe',
        phone: '+15551234567',
        street: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
      };

      const result = await service.createAddress('user-1', dto);

      expect(prisma.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          isDefault: true,
        }),
      });
      expect(result).toEqual(mockAddress);
    });

    it('should update existing address', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);
      mockPrismaService.address.update.mockResolvedValue({
        ...mockAddress,
        street: '456 Tech Blvd',
      });

      const result = await service.updateAddress('user-1', 'addr-1', {
        recipientName: 'Jane Doe',
        phone: '+15551234567',
        street: '456 Tech Blvd',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
      });

      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: expect.objectContaining({ street: '456 Tech Blvd' }),
      });
      expect(result.street).toBe('456 Tech Blvd');
    });

    it('should delete address', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);
      mockPrismaService.address.delete.mockResolvedValue(mockAddress);

      const result = await service.deleteAddress('user-1', 'addr-1');

      expect(prisma.address.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
      expect(result.message).toContain('deleted');
    });
  });

  describe('Set Default Address & Validation', () => {
    it('should atomically switch default address', async () => {
      mockPrismaService.address.findFirst.mockResolvedValue(mockAddress);
      mockPrismaService.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.setDefaultAddress('user-1', 'addr-1');

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { isDefault: true },
      });
      expect(result).toBeDefined();
    });

    it('should reject invalid postal codes in address validation', () => {
      expect(() =>
        service.validateAddress({
          recipientName: 'Jane',
          phone: '+15551234567',
          street: '123',
          city: 'SF',
          state: 'CA',
          postalCode: '1',
        }),
      ).toThrow(BadRequestException);
    });
  });
});
