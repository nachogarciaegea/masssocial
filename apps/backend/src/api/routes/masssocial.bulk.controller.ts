import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { BulkService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/bulk.service';
import {
  BulkCommitDto,
  BulkPlanDto,
  BulkPreviewDto,
} from '@gitroom/nestjs-libraries/dtos/masssocial/bulk.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('MASSSOCIAL')
@Controller('/masssocial/bulk')
export class MasssocialBulkController {
  constructor(private _bulkService: BulkService) {}

  @Post('/parse')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  parse(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No se ha recibido ningún archivo');
    }
    return this._bulkService.parse(file.buffer, file.originalname);
  }

  @Post('/preview')
  preview(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BulkPreviewDto
  ) {
    return this._bulkService.preview(org.id, body.rows);
  }

  @Post('/commit')
  @CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH])
  commit(@GetOrgFromRequest() org: Organization, @Body() body: BulkCommitDto) {
    return this._bulkService.commit(org.id, body.rows);
  }

  @Post('/plan')
  plan(@GetOrgFromRequest() org: Organization, @Body() body: BulkPlanDto) {
    return this._bulkService.plan(org.id, body);
  }

  @Get('/template')
  template(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-masssocial.csv"'
    );
    res.send(this._bulkService.template());
  }
}
