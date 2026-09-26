import { Test, TestingModule } from '@nestjs/testing';
import { SubStatus } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getStats: jest.fn(),
    getHealth: jest.fn(),
    getUsers: jest.fn(),
    updateUserRole: jest.fn(),
    getSubscriptions: jest.fn(),
    getProviders: jest.fn(),
    getAnalytics: jest.fn(),
    getLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should delegate to service.getStats', async () => {
      const mockResult = {
        totalUsers: 5,
        totalConversations: 10,
        totalMessages: 50,
        totalSearches: 8,
        activeSubscriptions: { free: 4, premium: 1 },
        requestsToday: 12,
      };
      mockAdminService.getStats.mockResolvedValue(mockResult);

      const res = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });
  });

  describe('getHealth', () => {
    it('should delegate to service.getHealth', async () => {
      const mockResult = {
        status: 'ok',
        database: 'connected',
        uptime: 123.45,
        timestamp: '2026-09-26T23:00:00.000Z',
      };
      mockAdminService.getHealth.mockResolvedValue(mockResult);

      const res = await controller.getHealth();

      expect(service.getHealth).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });
  });

  describe('getUsers', () => {
    it('should delegate to service.getUsers with parsed query parameters', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getUsers.mockResolvedValue(mockResult);

      const res = await controller.getUsers('1', '20', 'john');

      expect(service.getUsers).toHaveBeenCalledWith(1, 20, 'john');
      expect(res).toEqual(mockResult);
    });
  });

  describe('updateUserRole', () => {
    it('should delegate to service.updateUserRole', async () => {
      const mockResult = {
        id: 'u1',
        email: 'user@example.com',
        name: 'User',
        role: 'ADMIN',
        createdAt: new Date(),
      };
      mockAdminService.updateUserRole.mockResolvedValue(mockResult);

      const res = await controller.updateUserRole('u1', { role: 'ADMIN' as any });

      expect(service.updateUserRole).toHaveBeenCalledWith('u1', {
        role: 'ADMIN',
      });
      expect(res).toEqual(mockResult);
    });
  });

  describe('getSubscriptions', () => {
    it('should delegate to service.getSubscriptions with parsed status and pagination', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getSubscriptions.mockResolvedValue(mockResult);

      const res = await controller.getSubscriptions('1', '20', SubStatus.ACTIVE);

      expect(service.getSubscriptions).toHaveBeenCalledWith(
        1,
        20,
        SubStatus.ACTIVE,
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('getProviders', () => {
    it('should delegate to service.getProviders', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getProviders.mockResolvedValue(mockResult);

      const res = await controller.getProviders('1', '20');

      expect(service.getProviders).toHaveBeenCalledWith(1, 20);
      expect(res).toEqual(mockResult);
    });
  });

  describe('getAnalytics', () => {
    it('should delegate to service.getAnalytics', async () => {
      const mockResult = { requestsPerDay: [], requestsPerEndpoint: [] };
      mockAdminService.getAnalytics.mockResolvedValue(mockResult);

      const res = await controller.getAnalytics();

      expect(service.getAnalytics).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });
  });

  describe('getLogs', () => {
    it('should delegate to service.getLogs with parsed query params', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getLogs.mockResolvedValue(mockResult);

      const res = await controller.getLogs('1', '20', 'u1', '200');

      expect(service.getLogs).toHaveBeenCalledWith(1, 20, 'u1', 200);
      expect(res).toEqual(mockResult);
    });
  });
});
