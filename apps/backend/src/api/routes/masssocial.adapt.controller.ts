import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { AdaptService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/adapt.service';
import { AdaptDto } from '@gitroom/nestjs-libraries/dtos/masssocial/adapt.dto';

@ApiTags('MASSSOCIAL')
@Controller('/masssocial/adapt')
export class MasssocialAdaptController {
  constructor(private _adaptService: AdaptService) {}

  @Post('/')
  adapt(@GetOrgFromRequest() org: Organization, @Body() body: AdaptDto) {
    return this._adaptService.adaptForIntegrations(org.id, body);
  }
}
