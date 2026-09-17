import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class BulkRepository {
  constructor(
    private _media: PrismaRepository<'media'>,
    private _tags: PrismaRepository<'tags'>
  ) {}

  // Busca un medio de la mediateca por id, nombre, nombre original o nombre de archivo del path
  findMedia(orgId: string, reference: string) {
    return this._media.model.media.findFirst({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { not: 'processing' },
        OR: [
          { id: reference },
          { name: { equals: reference, mode: 'insensitive' } },
          { originalName: { equals: reference, mode: 'insensitive' } },
          { path: { endsWith: `/${reference}`, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
      },
    });
  }

  getTags(orgId: string) {
    return this._tags.model.tags.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
