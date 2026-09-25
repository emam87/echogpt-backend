import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  const valid64HexKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return valid64HexKey;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should encrypt and decrypt a plainText string back to original value', () => {
    const originalText = 'sk-proj-1234567890secretkey';
    const encrypted = service.encrypt(originalText);

    expect(encrypted).not.toEqual(originalText);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(originalText);
  });

  it('should throw an error when decrypting a tampered ciphertext or auth tag', () => {
    const originalText = 'sk-proj-1234567890secretkey';
    const encrypted = service.encrypt(originalText);
    const parts = encrypted.split(':');

    // Tamper with the ciphertext (last part)
    const tamperedCiphertext =
      parts[0] + ':' + parts[1] + ':' + (parts[2].slice(0, -2) + '00');

    expect(() => service.decrypt(tamperedCiphertext)).toThrow();
  });

  it('should throw an error on startup if ENCRYPTION_KEY is missing or invalid hex length', () => {
    const invalidConfigService = {
      get: jest.fn(() => 'invalid_key'),
    } as any;

    expect(() => new CryptoService(invalidConfigService)).toThrow(
      'ENCRYPTION_KEY must be configured as a 64-character hex string (32 bytes)',
    );
  });
});
