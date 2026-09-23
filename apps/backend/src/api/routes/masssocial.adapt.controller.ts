import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { AdaptService } from '@gitroom/nestjs-libraries/database/prisma/masssocial/adapt.service';
import { FreeAiService } from '@gitroom/nestjs-libraries/openai/free.ai.service';
import { AdaptDto } from '@gitroom/nestjs-libraries/dtos/masssocial/adapt.dto';
import { AiDraftDto } from '@gitroom/nestjs-libraries/dtos/masssocial/ai.draft.dto';

@ApiTags('MASSSOCIAL')
@Controller('/masssocial/adapt')
export class MasssocialAdaptController {
  constructor(
    private _adaptService: AdaptService,
    private _freeAiService: FreeAiService
  ) {}

  // El creador de post consulta esto para mostrar u ocultar el botón de IA
  // (sin clave de pago: solo aparece si hay una IA gratuita configurada).
  @Get('/ai-status')
  aiStatus() {
    return {
      available: this._freeAiService.isConfigured(),
      provider: this._freeAiService.providerName(),
    };
  }

  @Post('/')
  adapt(@GetOrgFromRequest() org: Organization, @Body() body: AdaptDto) {
    return this._adaptService.adaptForIntegrations(org.id, body);
  }

  @Post('/draft')
  draft(@GetOrgFromRequest() org: Organization, @Body() body: AiDraftDto) {
    return this._adaptService.draftForIntegrations(
      org.id,
      body.instruction,
      body.integrationIds,
      body.projectId,
      body.currentText
    );
  }
}
