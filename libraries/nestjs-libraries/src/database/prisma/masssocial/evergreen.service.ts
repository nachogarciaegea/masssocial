import { Injectable, NotFoundException } from '@nestjs/common';
import { EvergreenRepository } from '@gitroom/nestjs-libraries/database/prisma/masssocial/evergreen.repository';

@Injectable()
export class EvergreenService {
  constructor(private _evergreenRepository: EvergreenRepository) {}

  async getEvergreenPosts(orgId: string) {
    const posts = await this._evergreenRepository.getEvergreenPosts(orgId);
    return {
      posts: posts.map((post) => ({
        id: post.id,
        content: post.content,
        publishDate: post.publishDate.toISOString(),
        intervalInDays: post.intervalInDays,
        state: post.state,
        integration: {
          id: post.integration.id,
          name: post.integration.name,
          identifier: post.integration.providerIdentifier,
          picture: post.integration.picture || '',
        },
      })),
    };
  }

  async updateInterval(
    orgId: string,
    postId: string,
    intervalInDays: number | null
  ) {
    const post = await this._evergreenRepository.getPost(orgId, postId);
    if (!post) {
      throw new NotFoundException('Publicación no encontrada');
    }

    await this._evergreenRepository.updateInterval(
      orgId,
      postId,
      intervalInDays ?? null
    );
    return { ok: true };
  }
}
