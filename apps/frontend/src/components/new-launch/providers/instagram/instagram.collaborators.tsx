'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { InstagramCollaboratorsTags } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.tags';
import { InstagramAudioSelector } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.audio';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { InstagramPreview } from '@gitroom/frontend/components/new-launch/providers/instagram/instagram.preview';
const postType = [
  {
    value: 'post',
    label: 'Post (imagen o carrusel)',
  },
  {
    value: 'reel',
    label: 'Reel (un solo vídeo vertical)',
  },
  {
    value: 'story',
    label: 'Story',
  },
];

const typeHelp: Record<string, string> = {
  post: 'Imagen o carrusel de hasta 10. Se queda en tu perfil.',
  reel: 'Un solo vídeo vertical (9:16). Admite audio y Trial Reel.',
  story: 'Imagen o vídeo. Desaparece a las 24 horas.',
};

const graduationStrategies = [
  {
    value: 'MANUAL',
    label: 'Manual',
  },
  {
    value: 'SS_PERFORMANCE',
    label: 'Auto (based on performance)',
  },
];
const InstagramCollaborators: FC<{
  values?: any;
}> = (props) => {
  const t = useT();
  const { watch, register, formState, control } = useSettings();
  const { integration } = useIntegration();
  const postCurrentType = watch('post_type');
  const isTrialReel = watch('is_trial_reel');
  // The Audio API is only available with Facebook Login, not Instagram Login
  const supportsAudio = integration?.identifier === 'instagram';
  return (
    <>
      <div className="mb-[18px] p-[16px] rounded-[8px] border border-newBorder bg-newSettings">
        <div className="mb-[10px] text-[15px] font-[600]">
          {t('instagram_what_to_publish', '1 · ¿Qué vas a publicar?')}
        </div>
        <Select
          label=""
          {...register('post_type', {
            value: 'post',
          })}
        >
          <option value="">
            {t('select_post_type', 'Select Post Type...')}
          </option>
          {postType.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        {!!typeHelp[postCurrentType] && (
          <div className="mt-[8px] text-[13px] text-textItemBlur">
            {typeHelp[postCurrentType]}
          </div>
        )}
      </div>

      {postCurrentType !== 'story' && (
        <InstagramCollaboratorsTags
          label="Collaborators (max 3) - accounts can't be private"
          {...register('collaborators', {
            value: [],
          })}
        />
      )}

      {postCurrentType === 'reel' && (
        <div className="mt-[18px]">
          <InstagramAudioSelector
            label={t(
              'instagram_audio_label',
              'Audio (Reels only - single video)'
            )}
            disabled={!supportsAudio}
            {...register('audio')}
          />
        </div>
      )}

      {postCurrentType === 'reel' && (
        <div className="mt-[18px] flex flex-col gap-[18px]">
          <Checkbox
            {...register('is_trial_reel', {
              value: false,
            })}
            label={t('trial_reel', 'Trial Reel (share only to non-followers first)')}
          />

          {isTrialReel && (
            <Select
              label="Graduation Strategy"
              {...register('graduation_strategy', {
                value: 'MANUAL',
              })}
            >
              {graduationStrategies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
    </>
  );
};
export default withProvider<InstagramDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: InstagramCollaborators,
  CustomPreviewComponent: InstagramPreview,
  dto: InstagramDto,
  maximumCharacters: 2200,
  comments: 'no-media'
});
