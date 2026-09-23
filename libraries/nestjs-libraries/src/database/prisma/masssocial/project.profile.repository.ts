import { Injectable } from '@nestjs/common';
import {
  PrismaRepository,
  PrismaTransaction,
} from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ProjectProfileDto } from '@gitroom/nestjs-libraries/dtos/masssocial/project.dto';

@Injectable()
export class ProjectProfileRepository {
  constructor(
    private _customers: PrismaRepository<'customer'>,
    private _profiles: PrismaRepository<'projectProfile'>,
    private _integration: PrismaRepository<'integration'>,
    private _transaction: PrismaTransaction
  ) {}

  getCustomers(orgId: string) {
    return this._customers.model.customer.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
      include: {
        profile: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  getCustomer(orgId: string, customerId: string) {
    return this._customers.model.customer.findFirst({
      where: {
        id: customerId,
        orgId,
        deletedAt: null,
      },
      include: {
        profile: true,
      },
    });
  }

  getCustomerByName(orgId: string, name: string) {
    return this._customers.model.customer.findFirst({
      where: {
        orgId,
        deletedAt: null,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      include: {
        profile: true,
      },
    });
  }

  createCustomer(orgId: string, name: string) {
    return this._customers.model.customer.create({
      data: {
        name,
        orgId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  getIntegrations(orgId: string) {
    return this._integration.model.integration.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        providerIdentifier: true,
        picture: true,
        disabled: true,
        customerId: true,
        additionalSettings: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  upsertProfile(orgId: string, customerId: string, body: ProjectProfileDto) {
    const data = {
      tone: body.tone ?? null,
      language: body.language ?? null,
      hashtags: body.hashtags ?? null,
      timezone: body.timezone ?? null,
      defaultTimes: body.defaultTimes ? JSON.stringify(body.defaultTimes) : null,
      color: body.color ?? null,
      notes: body.notes ?? null,
      examples: body.examples ?? null,
    };

    return this._profiles.model.projectProfile.upsert({
      where: {
        customerId,
      },
      create: {
        organizationId: orgId,
        customerId,
        ...data,
      },
      update: {
        ...data,
        deletedAt: null,
      },
    });
  }

  setChannels(orgId: string, customerId: string, integrationIds: string[]) {
    return this._transaction.model.$transaction([
      this._integration.model.integration.updateMany({
        where: {
          organizationId: orgId,
          customerId,
          id: { notIn: integrationIds },
        },
        data: {
          customerId: null,
        },
      }),
      this._integration.model.integration.updateMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          id: { in: integrationIds },
        },
        data: {
          customerId,
        },
      }),
    ]);
  }

  deleteCustomer(orgId: string, customerId: string) {
    return this._transaction.model.$transaction([
      this._integration.model.integration.updateMany({
        where: {
          organizationId: orgId,
          customerId,
        },
        data: {
          customerId: null,
        },
      }),
      this._profiles.model.projectProfile.updateMany({
        where: {
          organizationId: orgId,
          customerId,
        },
        data: {
          deletedAt: new Date(),
        },
      }),
      this._customers.model.customer.update({
        where: {
          id: customerId,
          orgId,
        },
        data: {
          deletedAt: new Date(),
        },
      }),
    ]);
  }
}
