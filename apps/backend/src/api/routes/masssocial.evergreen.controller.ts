import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { EvergreenService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/evergreen.service';
import { UpdateEvergreenDto } from '@gitroom/nestjs-libraries/dtos/masssocial/evergreen.dto';

@ApiTags('MASSSOCIAL')
@Controller('/masssocial/evergreen')
export class MasssocialEvergreenController {
  constructor(private _evergreenService: EvergreenService) {}

  @Get('/')
  getEvergreen(@GetOrgFromRequest() org: Organization) {
    return this._evergreenService.getEvergreenPosts(org.id);
  }

  @Put('/:postId')
  updateInterval(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Body() body: UpdateEvergreenDto
  ) {
    return this._evergreenService.updateInterval(
      org.id,
      postId,
      body.intervalInDays ?? null
    );
  }
}
