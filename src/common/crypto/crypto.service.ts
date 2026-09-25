import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly keyBuffer: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    const key =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      process.env.ENCRYPTION_KEY;

    if (!key || typeof key !== 'string' || !/^[0-9a-fA-F]{64}$/.test(key)) {
      throw new Error(
        'ENCRYPTION_KEY must be configured as a 64-character hex string (32 bytes)',
      );
    }
    this.keyBuffer = Buffer.from(key, 'hex');
  }

  encrypt(plainText: string): string {
    if (!plainText) {
      return plainText;
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${ivHex}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedString: string): string {
    if (!encryptedString) {
      return encryptedString;
    }
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted string format. Expected iv:authTag:ciphertext',
      );
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
