import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectProfile } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import {
  DEFAULT_TIMEZONE,
  ProjectProfileService,
} from '@gitroom/nestjs-libraries/database/prisma/masssocial/project.profile.service';
import { AdaptService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/adapt.service';
import { BulkRepository } from '@gitroom/nestjs-libraries/database/prisma/masssocial/bulk.repository';
import { BulkParserService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/bulk.parser.service';
import {
  BulkMediaDto,
  BulkPlanDto,
  BulkRowInputDto,
  BulkRowPreviewDto,
  BulkTargetDto,
} from '@gitroom/nestjs-libraries/dtos/masssocial/bulk.dto';
import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

type IntegrationRow = Awaited<
  ReturnType<ProjectProfileService['getIntegrations']>
>[number];

type CustomerRow = Awaited<
  ReturnType<ProjectProfileService['getCustomerByName']>
>;

const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4'];
const LIST_SEPARATOR = /[|;,]/;
const YES = ['si', 'sí', 'yes', 'true', '1', 'x'];
const NO = ['no', 'false', '0'];
// Proveedores con defaults conocidos; el resto recibe {} y un aviso
const KNOWN_PROVIDERS = [
  'instagram',
  'instagram-standalone',
  'tiktok',
  'tiktok-business',
  'youtube',
  'x',
  'pinterest',
  'facebook',
  'linkedin',
  'linkedin-page',
  'threads',
  'bluesky',
  'mastodon',
];
const MAX_PLAN_DAYS = 3650;

@Injectable()
export class BulkService {
  constructor(
    private _projectProfileService: ProjectProfileService,
    private _adaptService: AdaptService,
    private _bulkRepository: BulkRepository,
    private _bulkParserService: BulkParserService,
    private _mediaService: MediaService,
    private _postsService: PostsService
  ) {}

  parse(buffer: Buffer, fileName: string) {
    return this._bulkParserService.parse(buffer, fileName);
  }

  template() {
    return this._bulkParserService.template();
  }

  private isYes(value?: string, fallback = false) {
    const v = (value || '').trim().toLowerCase();
    if (!v) {
      return fallback;
    }
    if (YES.includes(v)) {
      return true;
    }
    if (NO.includes(v)) {
      return false;
    }
    return fallback;
  }

  private splitList(value?: string): string[] {
    return (value || '')
      .split(LIST_SEPARATOR)
      .map((v) => v.trim())
      .filter((v) => !!v);
  }

  private isValidTimezone(tz: string) {
    try {
      dayjs().tz(tz);
      return true;
    } catch {
      return false;
    }
  }

  private parseDate(
    fecha: string,
    hora: string,
    tz: string
  ): dayjs.Dayjs | undefined {
    const value = fecha.trim();
    // ISO completo con zona (2026-10-01T19:00:00Z o +02:00)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed.utc() : undefined;
    }

    // Fecha (y quizá hora) sin zona: se interpreta en la zona de la fila
    const dateFormats = ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'D/M/YYYY'];
    const timeFormats = ['HH:mm', 'H:mm', 'HH:mm:ss'];
    let datePart = value;
    let timePart = (hora || '').trim();
    const dateTimeMatch = value.match(/^(\S+)[T\s]+(\d{1,2}:\d{2}(:\d{2})?)$/);
    if (dateTimeMatch) {
      datePart = dateTimeMatch[1];
      timePart = timePart || dateTimeMatch[2];
    }

    for (const df of dateFormats) {
      for (const tf of timeFormats) {
        const format = `${df} ${tf}`;
        const input = `${datePart} ${timePart}`;
        // dayjs.tz lanza RangeError si el texto no encaja con el formato: se valida antes en modo estricto
        if (!dayjs(input, format, true).isValid()) {
          continue;
        }
        try {
          const parsed = dayjs.tz(input, format, tz);
          if (parsed.isValid()) {
            return parsed.utc();
          }
        } catch {
          // formato no válido para esta combinación
        }
      }
    }
    return undefined;
  }

  private defaultSettings(
    identifier: string,
    row: BulkRowInputDto,
    plainText: string
  ): { settings: Record<string, any>; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const titulo = (row.titulo || '').trim();
    let settings: Record<string, any> = {};

    switch (identifier) {
      case 'instagram':
      case 'instagram-standalone':
        settings = {
          post_type:
            (row.tipo || '').trim().toLowerCase() === 'story' ? 'story' : 'post',
        };
        break;
      case 'tiktok':
      case 'tiktok-business':
        settings = {
          privacy_level: 'PUBLIC_TO_EVERYONE',
          duet: false,
          stitch: false,
          comment: true,
          brand_content_toggle: false,
          brand_organic_toggle: false,
          autoAddMusic: 'no',
          content_posting_method: 'DIRECT_POST',
          ...(titulo ? { title: titulo } : {}),
        };
        break;
      case 'youtube':
        settings = {
          title: titulo || plainText.replace(/\s+/g, ' ').trim().slice(0, 100),
          type: 'public',
        };
        if (!settings.title || settings.title.length < 2) {
          errors.push('YouTube necesita un título (columna titulo)');
        }
        break;
      case 'x':
        settings = { who_can_reply_post: 'everyone' };
        break;
      case 'pinterest': {
        const tablero = (row.tablero || '').trim();
        if (!tablero) {
          errors.push('Pinterest necesita un tablero (columna tablero)');
        }
        settings = { board: tablero, ...(titulo ? { title: titulo } : {}) };
        break;
      }
      default:
        settings = {};
        if (!KNOWN_PROVIDERS.includes(identifier)) {
          warnings.push(`${identifier}: revisa los ajustes de este canal`);
        }
    }

    return { settings, errors, warnings };
  }

  private async resolveMedia(
    orgId: string,
    references: string[],
    errors: string[],
    warnings: string[]
  ): Promise<BulkMediaDto[]> {
    const media: BulkMediaDto[] = [];
    for (const reference of references) {
      if (/^https?:\/\//i.test(reference)) {
        const path = reference.split('?')[0].toLowerCase();
        if (!reference.toLowerCase().startsWith('https://')) {
          errors.push(`El medio «${reference}» debe ser una URL https`);
          continue;
        }
        if (!VALID_EXTENSIONS.some((ext) => path.endsWith(ext))) {
          errors.push(
            `El medio «${reference}» debe terminar en ${VALID_EXTENSIONS.join(', ')}`
          );
          continue;
        }
        // Se descarga a la mediateca al confirmar (la vista previa no crea nada)
        media.push({
          id: '',
          path: reference,
          name: reference.split('/').pop() || reference,
        });
        warnings.push(`«${reference}» se descargará a la mediateca al confirmar`);
        continue;
      }

      const found = await this._bulkRepository.findMedia(orgId, reference);
      if (!found) {
        errors.push(`Medio «${reference}» no encontrado en la mediateca`);
        continue;
      }
      const path = found.path.split('?')[0].toLowerCase();
      if (!VALID_EXTENSIONS.some((ext) => path.endsWith(ext))) {
        errors.push(
          `El medio «${reference}» tiene un formato no compatible (${found.path})`
        );
        continue;
      }
      media.push({
        id: found.id,
        path: found.path,
        name: found.originalName || found.name,
        ...(found.thumbnail ? { thumbnail: found.thumbnail } : {}),
      });
    }
    return media;
  }

  private matchesIdentifier(integration: IntegrationRow, token: string) {
    const identifier = integration.providerIdentifier.toLowerCase();
    return identifier === token || identifier.split('-')[0] === token;
  }

  private async resolveTargets(
    orgId: string,
    tokens: string[],
    integrations: IntegrationRow[],
    customer: CustomerRow | undefined,
    errors: string[],
    warnings: string[]
  ): Promise<IntegrationRow[]> {
    const enabled = integrations.filter((i) => !i.disabled);
    const projectChannels = customer
      ? enabled.filter((i) => i.customerId === customer.id)
      : [];

    if (!tokens.length) {
      if (!customer) {
        errors.push('Indica las redes (columna redes) o un proyecto');
        return [];
      }
      if (!projectChannels.length) {
        errors.push(`El proyecto «${customer.name}» no tiene canales activos`);
      }
      return projectChannels;
    }

    const result = new Map<string, IntegrationRow>();
    for (const rawToken of tokens) {
      const token = rawToken.toLowerCase();
      const scope = customer ? projectChannels : enabled;

      // 1) id exacto del canal
      const byId = enabled.find((i) => i.id === rawToken);
      if (byId) {
        result.set(byId.id, byId);
        continue;
      }

      // 2) identificador de proveedor (instagram, tiktok, x...)
      const byIdentifier = scope.filter((i) => this.matchesIdentifier(i, token));
      if (byIdentifier.length) {
        if (byIdentifier.length > 1 && !customer) {
          warnings.push(
            `«${rawToken}» coincide con ${byIdentifier.length} canales; se usan todos`
          );
        }
        byIdentifier.forEach((i) => result.set(i.id, i));
        continue;
      }

      // 3) nombre del canal (contiene, sin distinguir mayúsculas)
      const byName = (customer ? projectChannels : enabled).filter((i) =>
        i.name.toLowerCase().includes(token)
      );
      const byNameFallback = byName.length
        ? byName
        : enabled.filter((i) => i.name.toLowerCase().includes(token));
      if (byNameFallback.length) {
        byNameFallback.forEach((i) => result.set(i.id, i));
        continue;
      }

      // 4) "<proyecto> <identificador>"
      const parts = rawToken.trim().split(/\s+/);
      if (parts.length > 1) {
        const identifier = parts[parts.length - 1].toLowerCase();
        const projectName = parts.slice(0, -1).join(' ');
        const other = await this._projectProfileService.getCustomerByName(
          orgId,
          projectName
        );
        if (other) {
          const matches = enabled.filter(
            (i) =>
              i.customerId === other.id && this.matchesIdentifier(i, identifier)
          );
          if (matches.length) {
            matches.forEach((i) => result.set(i.id, i));
            continue;
          }
        }
      }

      const disabledMatch = integrations.find(
        (i) =>
          i.disabled &&
          (this.matchesIdentifier(i, token) ||
            i.name.toLowerCase().includes(token))
      );
      errors.push(
        disabledMatch
          ? `El canal «${rawToken}» está desactivado`
          : `Red o canal «${rawToken}» no encontrado`
      );
    }

    return Array.from(result.values());
  }

  private async previewRow(
    orgId: string,
    row: BulkRowInputDto,
    integrations: IntegrationRow[],
    tagNames: Set<string>
  ): Promise<BulkRowPreviewDto> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { index, ...rest } = row;
    const raw = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined && v !== null)
    ) as Record<string, string>;

    const draft = this.isYes(row.borrador, false);
    const adapt = this.isYes(row.adaptar, true);

    // Proyecto
    let customer: CustomerRow | undefined;
    if (row.proyecto?.trim()) {
      customer = await this._projectProfileService.getCustomerByName(
        orgId,
        row.proyecto.trim()
      );
      if (!customer) {
        errors.push(`Proyecto «${row.proyecto.trim()}» no encontrado`);
      }
    }
    const profile: ProjectProfile | null =
      customer?.profile && !customer.profile.deletedAt ? customer.profile : null;

    // Zona horaria
    let tz = (row.zona_horaria || '').trim() || this._projectProfileService.getTimezone(profile);
    if (!this.isValidTimezone(tz)) {
      errors.push(`Zona horaria «${tz}» no válida`);
      tz = DEFAULT_TIMEZONE;
    }

    // Fecha y hora
    let date = '';
    if (!row.fecha?.trim()) {
      errors.push('Falta la fecha (columna fecha)');
    } else {
      let hora = (row.hora || '').trim();
      if (!hora && !/[T\s]\d{1,2}:\d{2}/.test(row.fecha) && !/T/.test(row.fecha)) {
        hora = this._projectProfileService.getDefaultTimes(profile)[0] || '12:00';
        warnings.push(`Sin hora: se usa ${hora} (${tz})`);
      }
      const parsed = this.parseDate(row.fecha, hora, tz);
      if (!parsed) {
        errors.push(`Fecha u hora no válida: «${row.fecha}${hora ? ' ' + hora : ''}»`);
      } else {
        date = parsed.toISOString();
        if (parsed.isBefore(dayjs())) {
          if (draft) {
            warnings.push('La fecha ya ha pasado (se guarda como borrador)');
          } else {
            errors.push('La fecha ya ha pasado');
          }
        }
      }
    }

    // Perenne
    let inter: number | undefined;
    if (row.repetir_dias?.trim()) {
      const parsed = parseInt(row.repetir_dias.trim(), 10);
      if (isNaN(parsed) || parsed < 1) {
        errors.push(`repetir_dias debe ser un número mayor que 0 («${row.repetir_dias}»)`);
      } else {
        inter = parsed;
      }
    }

    // Etiquetas (las que no existen se ignoran al crear)
    const tags = this.splitList(row.etiquetas);
    for (const tag of tags) {
      if (!tagNames.has(tag.toLowerCase())) {
        warnings.push(`La etiqueta «${tag}» no existe y se ignorará`);
      }
    }

    // Medios
    const media = await this.resolveMedia(
      orgId,
      this.splitList(row.medios),
      errors,
      warnings
    );

    // Contenido
    const plainParagraphs = this._adaptService.toParagraphs(row.texto || '');
    const plainText = plainParagraphs.join('\n\n');
    if (!plainText && !media.length) {
      errors.push('La fila no tiene texto ni medios');
    }

    // Canales
    const resolved = await this.resolveTargets(
      orgId,
      this.splitList(row.redes),
      integrations,
      customer,
      errors,
      warnings
    );
    if (!resolved.length && !errors.some((e) => e.includes('canal') || e.includes('redes') || e.includes('Proyecto'))) {
      errors.push('No se ha resuelto ningún canal');
    }

    const adaptOptions = this._adaptService.optionsFromProfile(profile, false);
    const targets: BulkTargetDto[] = [];
    for (const integration of resolved) {
      const identifier = integration.providerIdentifier;
      const defaults = this.defaultSettings(identifier, row, plainText);
      errors.push(...defaults.errors);
      warnings.push(...defaults.warnings);

      const maxLength = this._adaptService.getMaxLength(
        identifier,
        integration.additionalSettings,
        defaults.settings
      );

      let content: string;
      let truncated = false;
      if (adapt) {
        const adapted = await this._adaptService.adapt(
          row.texto || '',
          { identifier, maxLength, settings: defaults.settings },
          adaptOptions
        );
        content = adapted.content;
        truncated = adapted.truncated;
        adapted.notes.forEach((note) => warnings.push(`${integration.name}: ${note}`));
      } else {
        content = this._adaptService.toHtml(plainParagraphs);
        const length = this._adaptService.length(identifier, plainText);
        if (length > maxLength) {
          errors.push(
            `${integration.name}: texto demasiado largo (${length}/${maxLength}) y adaptar=no`
          );
        }
      }

      targets.push({
        integrationId: integration.id,
        name: integration.name,
        identifier,
        picture: integration.picture || undefined,
        content,
        settings: defaults.settings,
        maxLength,
        truncated,
      });
    }

    return {
      index,
      date,
      inter,
      tags,
      draft,
      project: customer ? { id: customer.id, name: customer.name } : undefined,
      media,
      targets,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
      raw,
    };
  }

  async preview(orgId: string, rows: BulkRowInputDto[]) {
    const [integrations, tags] = await Promise.all([
      this._projectProfileService.getIntegrations(orgId),
      this._bulkRepository.getTags(orgId),
    ]);
    const tagNames = new Set(tags.map((t) => t.name.toLowerCase()));

    const previews: BulkRowPreviewDto[] = [];
    for (const row of rows) {
      previews.push(await this.previewRow(orgId, row, integrations, tagNames));
    }
    return { rows: previews };
  }

  private async commitRow(orgId: string, row: BulkRowPreviewDto) {
    if (row.errors?.length) {
      throw new Error(`La fila tiene errores: ${row.errors.join('; ')}`);
    }
    if (!row.targets?.length) {
      throw new Error('La fila no tiene canales');
    }

    // Medios por URL: se descargan ahora a la mediateca
    const image = [];
    for (const media of row.media || []) {
      if (!media.id && /^https:\/\//i.test(media.path)) {
        const uploaded = await this._mediaService.uploadFromUrl(orgId, media.path);
        image.push({ id: uploaded.id, path: uploaded.path });
      } else {
        image.push({ id: media.id, path: media.path });
      }
    }

    const rawBody = {
      type: row.draft ? 'draft' : 'schedule',
      shortLink: false,
      date: row.date,
      ...(row.inter ? { inter: row.inter } : {}),
      tags: (row.tags || []).map((tag) => ({ value: tag, label: tag })),
      posts: row.targets.map((target) => ({
        integration: { id: target.integrationId },
        value: [{ content: target.content, image }],
        settings: target.settings || {},
      })),
    } as unknown as CreatePostDto;

    const body = await this._postsService.mapTypeToPost(rawBody, orgId);
    const validation = await this._postsService.validatePosts(
      orgId,
      body.posts as any
    );

    for (const item of validation) {
      if (item.emptyContent) {
        throw new Error(`${item.name}: la publicación necesita texto o un medio`);
      }
    }
    if (body.type !== 'draft') {
      for (const item of validation) {
        if (!item.valid) {
          throw new Error(`${item.name}: ${item.settingsError || 'revisa los ajustes'}`);
        }
        if (item.errors !== true) {
          throw new Error(`${item.name}: ${item.errors}`);
        }
        if (item.tooLong) {
          throw new Error(`${item.name}: el texto es demasiado largo`);
        }
      }
    }

    return this._postsService.createPost(orgId, body, 'WEB');
  }

  async commit(orgId: string, rows: BulkRowPreviewDto[]) {
    const created: { index: number; postId: string; integrationId: string }[] = [];
    const failed: { index: number; error: string }[] = [];

    for (const row of rows) {
      try {
        const result = await this.commitRow(orgId, row);
        for (const item of result) {
          created.push({
            index: row.index,
            postId: item.postId,
            integrationId: item.integration,
          });
        }
      } catch (err: any) {
        failed.push({
          index: row.index,
          error: err?.response?.message || err?.message || 'Error desconocido',
        });
      }
    }

    return { created, failed };
  }

  async plan(orgId: string, body: BulkPlanDto) {
    let customer: Awaited<ReturnType<ProjectProfileService['getCustomer']>> = null;
    if (body.projectId) {
      customer = await this._projectProfileService.getCustomer(orgId, body.projectId);
      if (!customer) {
        throw new BadRequestException('Proyecto no encontrado');
      }
    }
    const profile = customer?.profile && !customer.profile.deletedAt ? customer.profile : null;
    const tz = body.timezone || this._projectProfileService.getTimezone(profile);
    if (!this.isValidTimezone(tz)) {
      throw new BadRequestException(`Zona horaria «${tz}» no válida`);
    }

    const integrations = await this._projectProfileService.getIntegrations(orgId);
    const enabledIds = new Set(integrations.filter((i) => !i.disabled).map((i) => i.id));
    const missing = body.integrationIds.filter((id) => !enabledIds.has(id));
    if (missing.length) {
      throw new BadRequestException(`Canales no encontrados o desactivados: ${missing.join(', ')}`);
    }

    const weekdays = new Set(body.weekdays?.length ? body.weekdays : [1, 2, 3, 4, 5, 6, 7]);
    const timesOfDay = Array.from(new Set(body.timesOfDay)).sort();
    const perDay = Math.min(
      body.perDay || timesOfDay.length,
      body.maxPerNetworkPerDay || Number.MAX_SAFE_INTEGER
    );

    const now = dayjs();
    if (!dayjs(body.start, 'YYYY-MM-DD', true).isValid()) {
      throw new BadRequestException('Fecha de inicio no válida');
    }
    let day = dayjs.tz(body.start, 'YYYY-MM-DD', tz);

    const rows: BulkRowInputDto[] = [];
    let item = 0;
    let iterations = 0;
    while (item < body.items.length && iterations < MAX_PLAN_DAYS) {
      iterations++;
      const isoWeekday = day.day() === 0 ? 7 : day.day();
      if (weekdays.has(isoWeekday)) {
        let placedToday = 0;
        for (const time of timesOfDay) {
          if (item >= body.items.length || placedToday >= perDay) {
            break;
          }
          const [h, m] = time.split(':').map((v) => parseInt(v, 10));
          const slot = day.hour(h).minute(m).second(0).millisecond(0);
          if (!slot.isAfter(now)) {
            continue;
          }
          const current = body.items[item];
          rows.push({
            index: item + 1,
            fecha: slot.format('YYYY-MM-DD'),
            hora: slot.format('HH:mm'),
            zona_horaria: tz,
            ...(customer ? { proyecto: customer.name } : {}),
            redes: body.integrationIds.join('|'),
            texto: current.content,
            medios: (current.mediaIds || []).join('|'),
            ...(current.title ? { titulo: current.title } : {}),
            ...(body.inter ? { repetir_dias: String(body.inter) } : {}),
            borrador: body.draft ? 'si' : 'no',
            adaptar: body.adapt === false ? 'no' : 'si',
          });
          item++;
          placedToday++;
        }
      }
      day = day.add(1, 'day');
    }

    if (item < body.items.length) {
      throw new BadRequestException(
        'No hay huecos suficientes para todos los elementos con esa configuración'
      );
    }

    return this.preview(orgId, rows);
  }
}
