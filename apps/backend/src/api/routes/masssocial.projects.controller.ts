import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ProjectProfileService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/project.profile.service';
import {
  CreateProjectDto,
  ProjectChannelsDto,
  ProjectProfileDto,
} from '@gitroom/nestjs-libraries/dtos/masssocial/project.dto';

@ApiTags('MASSSOCIAL')
@Controller('/masssocial/projects')
export class MasssocialProjectsController {
  constructor(private _projectProfileService: ProjectProfileService) {}

  @Get('/')
  getProjects(@GetOrgFromRequest() org: Organization) {
    return this._projectProfileService.getProjects(org.id);
  }

  @Post('/')
  createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateProjectDto
  ) {
    return this._projectProfileService.createProject(org.id, body.name);
  }

  @Put('/:customerId/profile')
  updateProfile(
    @GetOrgFromRequest() org: Organization,
    @Param('customerId') customerId: string,
    @Body() body: ProjectProfileDto
  ) {
    return this._projectProfileService.updateProfile(org.id, customerId, body);
  }

  @Put('/:customerId/channels')
  setChannels(
    @GetOrgFromRequest() org: Organization,
    @Param('customerId') customerId: string,
    @Body() body: ProjectChannelsDto
  ) {
    return this._projectProfileService.setChannels(
      org.id,
      customerId,
      body.integrationIds
    );
  }

  @Delete('/:customerId')
  deleteProject(
    @GetOrgFromRequest() org: Organization,
    @Param('customerId') customerId: string
  ) {
    return this._projectProfileService.deleteProject(org.id, customerId);
  }
}
