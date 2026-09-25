import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
    deleteUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('getProfile should delegate to service.getProfile', async () => {
    const profile = { id: 'u1', email: 'a@b.com' };
    mockUsersService.getProfile.mockResolvedValue(profile);

    const result = await controller.getProfile('u1');

    expect(service.getProfile).toHaveBeenCalledWith('u1');
    expect(result).toBe(profile);
  });

  it('updateProfile should delegate to service.updateProfile', async () => {
    const dto = { name: 'New Name' };
    const profile = { id: 'u1', name: 'New Name' };
    mockUsersService.updateProfile.mockResolvedValue(profile);

    const result = await controller.updateProfile('u1', dto);

    expect(service.updateProfile).toHaveBeenCalledWith('u1', dto);
    expect(result).toBe(profile);
  });

  it('updatePassword should delegate to service.updatePassword', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    const res = { message: 'Success' };
    mockUsersService.updatePassword.mockResolvedValue(res);

    const result = await controller.updatePassword('u1', dto);

    expect(service.updatePassword).toHaveBeenCalledWith('u1', dto);
    expect(result).toBe(res);
  });

  it('deleteAccount should delegate to service.deleteUser', async () => {
    mockUsersService.deleteUser.mockResolvedValue(undefined);

    await controller.deleteAccount('u1');

    expect(service.deleteUser).toHaveBeenCalledWith('u1');
  });
});
