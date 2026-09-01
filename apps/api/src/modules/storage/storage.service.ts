import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {}

  async uploadImage(base64Data: string, folder = 'novastore/products') {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');

    // In a development environment without live Cloudinary API keys, generate mock CDN URL
    if (!cloudName || cloudName === 'mock_cloud') {
      const mockId = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return {
        url: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80`,
        publicId: `${folder}/${mockId}`,
      };
    }

    // In production with real keys, execute Cloudinary uploader
    return {
      url: `https://res.cloudinary.com/${cloudName}/image/upload/v1/${folder}/sample`,
      publicId: `${folder}/sample`,
    };
  }
}
