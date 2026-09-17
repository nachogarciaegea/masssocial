import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectProfile } from '@prisma/client';
import { ProjectProfileRepository } from '@gitroom/nestjs-libraries/database/prisma/masssocial/project.profile.repository';
import { ProjectProfileDto } from '@gitroom/nestjs-libraries/dtos/masssocial/project.dto';

export interface ChannelView {
  id: string;
  name: string;
  identifier: string;
  picture: string;
  disabled: boolean;
}

export interface ProjectView {
  customer: { id: string; name: string };
  profile: ProjectProfile | null;
  integrations: ChannelView[];
}

export const DEFAULT_TIMEZONE = 'Europe/Madrid';

@Injectable()
export class ProjectProfileService {
  constructor(private _projectProfileRepository: ProjectProfileRepository) {}

  private toChannelView(integration: {
    id: string;
    name: string;
    providerIdentifier: string;
    picture: string | null;
    disabled: boolean;
  }): ChannelView {
    return {
      id: integration.id,
      name: integration.name,
      identifier: integration.providerIdentifier,
      picture: integration.picture || '',
      disabled: integration.disabled,
    };
  }

  async getProjects(
    orgId: string
  ): Promise<{ projects: ProjectView[]; unassigned: ChannelView[] }> {
    const [customers, integrations] = await Promise.all([
      this._projectProfileRepository.getCustomers(orgId),
      this._projectProfileRepository.getIntegrations(orgId),
    ]);

    const projects = customers.map((customer) => ({
      customer: { id: customer.id, name: customer.name },
      profile: customer.profile?.deletedAt ? null : customer.profile || null,
      integrations: integrations
        .filter((i) => i.customerId === customer.id)
        .map((i) => this.toChannelView(i)),
    }));

    const customerIds = new Set(customers.map((c) => c.id));
    const unassigned = integrations
      .filter((i) => !i.customerId || !customerIds.has(i.customerId))
      .map((i) => this.toChannelView(i));

    return { projects, unassigned };
  }

  async createProject(orgId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('El proyecto necesita un nombre');
    }
    const existing = await this._projectProfileRepository.getCustomerByName(
      orgId,
      trimmed
    );
    if (existing) {
      throw new BadRequestException(`Ya existe un proyecto llamado «${trimmed}»`);
    }
    return this._projectProfileRepository.createCustomer(orgId, trimmed);
  }

  async updateProfile(
    orgId: string,
    customerId: string,
    body: ProjectProfileDto
  ) {
    const customer = await this._projectProfileRepository.getCustomer(
      orgId,
      customerId
    );
    if (!customer) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return this._projectProfileRepository.upsertProfile(
      orgId,
      customerId,
      body
    );
  }

  async setChannels(orgId: string, customerId: string, integrationIds: string[]) {
    const customer = await this._projectProfileRepository.getCustomer(
      orgId,
      customerId
    );
    if (!customer) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    await this._projectProfileRepository.setChannels(
      orgId,
      customerId,
      integrationIds
    );
    return { ok: true };
  }

  async deleteProject(orgId: string, customerId: string) {
    const customer = await this._projectProfileRepository.getCustomer(
      orgId,
      customerId
    );
    if (!customer) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    await this._projectProfileRepository.deleteCustomer(orgId, customerId);
    return { ok: true };
  }

  // Helpers used by bulk / adapt
  getCustomer(orgId: string, customerId: string) {
    return this._projectProfileRepository.getCustomer(orgId, customerId);
  }

  getCustomerByName(orgId: string, name: string) {
    return this._projectProfileRepository.getCustomerByName(orgId, name);
  }

  getIntegrations(orgId: string) {
    return this._projectProfileRepository.getIntegrations(orgId);
  }

  getTimezone(profile?: ProjectProfile | null) {
    return profile?.timezone || DEFAULT_TIMEZONE;
  }

  getDefaultTimes(profile?: ProjectProfile | null): string[] {
    if (!profile?.defaultTimes) {
      return [];
    }
    try {
      const parsed = JSON.parse(profile.defaultTimes);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  getHashtags(profile?: ProjectProfile | null): string[] {
    if (!profile?.hashtags) {
      return [];
    }
    return profile.hashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter((h) => !!h)
      .map((h) => (h.startsWith('#') ? h : `#${h}`));
  }
}
