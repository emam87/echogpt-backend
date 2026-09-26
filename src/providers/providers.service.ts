import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiProvider, ProviderType } from '@prisma/client';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto, UpdateProviderDto } from './dto';
import { maskApiKey } from './utils/mask-api-key.util';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  private isAdmin(user: any): boolean {
    if (!user || !user.role) return false;
    const roleName = typeof user.role === 'string' ? user.role : user.role.name;
    return roleName === 'ADMIN';
  }

  private checkAccess(provider: AiProvider, user: any): void {
    if (this.isAdmin(user)) {
      return;
    }
    if (provider.userId !== user.id) {
      throw new NotFoundException('Provider not found');
    }
  }

  private checkHealthAccess(provider: AiProvider, user: any): void {
    if (this.isAdmin(user)) {
      return;
    }
    if (provider.userId !== null && provider.userId !== user.id) {
      throw new NotFoundException('Provider not found');
    }
  }

  private transformProvider(provider: AiProvider) {
    let rawKey = '';
    try {
      rawKey = this.cryptoService.decrypt(provider.encryptedApiKey);
    } catch {
      rawKey = '';
    }
    const { encryptedApiKey: _encryptedApiKey, ...rest } = provider;
    return {
      ...rest,
      apiKey: maskApiKey(rawKey),
    };
  }

  async create(user: any, dto: CreateProviderDto) {
    if (dto.isSystem && !this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can create system providers');
    }

    const targetUserId = dto.isSystem ? null : user.id;
    const encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);
    const isDefault = dto.isDefault ?? false;

    if (isDefault) {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.aiProvider.updateMany({
          where: { userId: targetUserId },
          data: { isDefault: false },
        });
        return tx.aiProvider.create({
          data: {
            userId: targetUserId,
            type: dto.type,
            name: dto.name,
            model: dto.model,
            encryptedApiKey,
            isDefault: true,
            isEnabled: true,
          },
        });
      });
      return this.transformProvider(created);
    }

    const created = await this.prisma.aiProvider.create({
      data: {
        userId: targetUserId,
        type: dto.type,
        name: dto.name,
        model: dto.model,
        encryptedApiKey,
        isDefault: false,
        isEnabled: true,
      },
    });

    return this.transformProvider(created);
  }

  async findAll(user: any) {
    const providers = await this.prisma.aiProvider.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return providers.map((provider) => this.transformProvider(provider));
  }

  async update(user: any, id: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.checkAccess(provider, user);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.apiKey !== undefined) {
      data.encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);
    }
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    if (dto.isDefault === true) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.aiProvider.updateMany({
          where: { userId: provider.userId },
          data: { isDefault: false },
        });
        return tx.aiProvider.update({
          where: { id },
          data,
        });
      });
      return this.transformProvider(updated);
    }

    const updated = await this.prisma.aiProvider.update({
      where: { id },
      data,
    });

    return this.transformProvider(updated);
  }

  async remove(user: any, id: string): Promise<void> {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.checkAccess(provider, user);

    await this.prisma.aiProvider.delete({ where: { id } });
  }

  async toggle(user: any, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.checkAccess(provider, user);

    const updated = await this.prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: !provider.isEnabled },
    });

    return this.transformProvider(updated);
  }

  async setDefault(user: any, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.checkAccess(provider, user);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.aiProvider.updateMany({
        where: { userId: provider.userId },
        data: { isDefault: false },
      });
      return tx.aiProvider.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return this.transformProvider(updated);
  }

  async checkHealth(user: any, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.checkHealthAccess(provider, user);

    let healthy = false;
    try {
      const rawApiKey = this.cryptoService.decrypt(provider.encryptedApiKey);
      if (rawApiKey) {
        healthy = await this.pingProviderApi(provider.type, rawApiKey);
      }
    } catch {
      healthy = false;
    }

    return {
      healthy,
      checkedAt: new Date().toISOString(),
    };
  }

  private async pingProviderApi(
    type: ProviderType,
    apiKey: string,
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      let url = '';
      const headers: Record<string, string> = {
        'User-Agent': 'EchoGPT-Backend-HealthCheck',
      };

      if (type === ProviderType.OPENAI) {
        url = 'https://api.openai.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (type === ProviderType.CLAUDE) {
        url = 'https://api.anthropic.com/v1/models';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (type === ProviderType.GEMINI) {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      } else {
        return false;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
