import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class EvergreenRepository {
  constructor(private _post: PrismaRepository<'post'>) {}

  getEvergreenPosts(orgId: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        intervalInDays: { not: null },
        deletedAt: null,
        parentPostId: null,
      },
      select: {
        id: true,
        content: true,
        publishDate: true,
        intervalInDays: true,
        state: true,
        integration: {
          select: {
            id: true,
            name: true,
            providerIdentifier: true,
            picture: true,
          },
        },
      },
      orderBy: {
        publishDate: 'desc',
      },
    });
  }

  getPost(orgId: string, postId: string) {
    return this._post.model.post.findFirst({
      where: {
        id: postId,
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  updateInterval(orgId: string, postId: string, intervalInDays: number | null) {
    return this._post.model.post.update({
      where: {
        id: postId,
        organizationId: orgId,
      },
      data: {
        intervalInDays,
      },
    });
  }
}
