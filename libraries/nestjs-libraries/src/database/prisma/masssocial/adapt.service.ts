import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectProfile } from '@prisma/client';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { ProjectProfileService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/project.profile.service';
import { AdaptDto } from '@gitroom/nestjs-libraries/dtos/masssocial/adapt.dto';
import { countLength } from '@gitroom/helpers/utils/count.length';
import striptags from 'striptags';

export interface AdaptTarget {
  identifier: string;
  maxLength: number;
  settings?: Record<string, any>;
}

export interface AdaptOptions {
  hashtags?: string[];
  tone?: string;
  language?: string;
  useAi?: boolean;
}

export interface AdaptResult {
  content: string; // HTML (<p>...</p>)
  plain: string; // texto plano final
  truncated: boolean;
  notes: string[];
}

// Redes en las que el texto se usa como descripción y no se retoca
const DESCRIPTION_ONLY = ['youtube', 'pinterest'];
const MAX_HASHTAGS: Record<string, number> = { x: 3 };
const ELLIPSIS = '…';

@Injectable()
export class AdaptService {
  constructor(
    private _openaiService: OpenaiService,
    private _integrationManager: IntegrationManager,
    private _projectProfileService: ProjectProfileService
  ) {}

  // Texto plano (o HTML del editor) -> párrafos de texto plano
  toParagraphs(content: string): string[] {
    const source = (content || '')
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n');
    const stripped = striptags(source)
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return stripped
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => !!p);
  }

  escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  toHtml(paragraphs: string[]): string {
    return paragraphs.map((p) => `<p>${this.escapeHtml(p)}</p>`).join('');
  }

  length(identifier: string, text: string): number {
    return countLength(identifier, text);
  }

  private truncate(identifier: string, text: string, maxLength: number) {
    if (this.length(identifier, text) <= maxLength) {
      return { text, truncated: false };
    }

    // Recorte por palabra: se quita hasta que quepa junto con la elipsis
    let cut = text;
    while (cut.length > 0 && this.length(identifier, cut + ELLIPSIS) > maxLength) {
      const lastSpace = cut.search(/\s\S*$/);
      cut = lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, -1);
      cut = cut.replace(/[\s,;:.]+$/, '');
    }

    return { text: cut + ELLIPSIS, truncated: true };
  }

  // Aplica solo las reglas (sin IA) sobre texto plano
  applyRules(
    content: string,
    target: AdaptTarget,
    options: AdaptOptions = {}
  ): AdaptResult {
    const notes: string[] = [];
    const maxLength = target.maxLength || 1000000;
    const descriptionOnly = DESCRIPTION_ONLY.includes(target.identifier);
    let paragraphs = this.toParagraphs(content);

    if (!descriptionOnly && options.hashtags?.length) {
      const limit = MAX_HASHTAGS[target.identifier];
      const present = new Set(
        (content.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.toLowerCase())
      );
      const hashtags = options.hashtags
        .filter((h) => !present.has(h.toLowerCase()))
        .slice(0, limit || options.hashtags.length);
      if (hashtags.length) {
        const candidate = [...paragraphs, hashtags.join(' ')];
        if (this.length(target.identifier, candidate.join('\n\n')) <= maxLength) {
          paragraphs = candidate;
        } else {
          notes.push('Los hashtags del proyecto no caben y se han omitido');
        }
      }
    }

    const joined = paragraphs.join('\n\n');
    const { text, truncated } = this.truncate(
      target.identifier,
      joined,
      maxLength
    );
    if (truncated) {
      notes.push(`Texto recortado a ${maxLength} caracteres`);
    }

    const finalParagraphs = text
      .split(/\n\n/)
      .map((p) => p.trim())
      .filter((p) => !!p);

    return {
      content: this.toHtml(finalParagraphs),
      plain: text,
      truncated,
      notes,
    };
  }

  async adapt(
    content: string,
    target: AdaptTarget,
    options: AdaptOptions = {}
  ): Promise<AdaptResult> {
    if (!options.useAi) {
      return this.applyRules(content, target, options);
    }

    if (!process.env.OPENAI_API_KEY) {
      const result = this.applyRules(content, target, options);
      result.notes.unshift(
        'IA no disponible (falta OPENAI_API_KEY): se han aplicado solo las reglas'
      );
      return result;
    }

    try {
      const plain = this.toParagraphs(content).join('\n\n');
      const rewritten = await this._openaiService.adaptPostForProvider(plain, {
        identifier: target.identifier,
        maxLength: target.maxLength,
        tone: options.tone,
        language: options.language,
        hashtags: options.hashtags,
      });
      // Las reglas garantizan el límite aunque la IA se pase
      const result = this.applyRules(rewritten, target, {
        ...options,
        hashtags: [],
      });
      result.notes.unshift('Texto reescrito con IA');
      return result;
    } catch (err: any) {
      const result = this.applyRules(content, target, options);
      result.notes.unshift(
        `La IA ha fallado (${err?.message || 'error'}): se han aplicado solo las reglas`
      );
      return result;
    }
  }

  getMaxLength(
    identifier: string,
    additionalSettings?: string | null,
    settings?: Record<string, any>
  ): number {
    const provider = this._integrationManager.getSocialIntegration(identifier);
    if (!provider) {
      return 1000000;
    }
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(additionalSettings || '[]');
    } catch {
      parsed = [];
    }
    try {
      return provider.maxLength(parsed, settings || {}) || 1000000;
    } catch {
      return 1000000;
    }
  }

  optionsFromProfile(
    profile?: ProjectProfile | null,
    useAi?: boolean
  ): AdaptOptions {
    return {
      hashtags: this._projectProfileService.getHashtags(profile),
      tone: profile?.tone || undefined,
      language: profile?.language || undefined,
      useAi,
    };
  }

  // POST /masssocial/adapt
  async adaptForIntegrations(orgId: string, body: AdaptDto) {
    const integrations = await this._projectProfileService.getIntegrations(
      orgId
    );
    const byId = new Map(integrations.map((i) => [i.id, i]));

    let profile: ProjectProfile | null = null;
    if (body.projectId) {
      const customer = await this._projectProfileService.getCustomer(
        orgId,
        body.projectId
      );
      if (!customer) {
        throw new NotFoundException('Proyecto no encontrado');
      }
      profile = customer.profile;
    }

    const options = this.optionsFromProfile(profile, body.useAi);

    const adaptations = await Promise.all(
      body.integrationIds.map(async (integrationId) => {
        const integration = byId.get(integrationId);
        if (!integration) {
          throw new NotFoundException(`Canal ${integrationId} no encontrado`);
        }
        const maxLength = this.getMaxLength(
          integration.providerIdentifier,
          integration.additionalSettings
        );
        const result = await this.adapt(
          body.content,
          { identifier: integration.providerIdentifier, maxLength },
          options
        );
        return {
          integrationId,
          identifier: integration.providerIdentifier,
          content: result.content,
          maxLength,
          truncated: result.truncated,
          notes: result.notes,
        };
      })
    );

    return { adaptations };
  }
}
