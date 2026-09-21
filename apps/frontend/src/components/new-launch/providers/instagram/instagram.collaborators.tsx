'use client';

import clsx from 'clsx';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC, useCallback } from 'react';
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
    label: 'Post',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" />
        <path
          d="M5 17l4.5-5 3.5 3.5L16 12l3 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    value: 'reel',
    label: 'Reel',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect
          x="4"
          y="2"
          width="16"
          height="20"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M10 9l6 3-6 3V9z" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'story',
    label: 'Story',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
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
  const { watch, register, setValue, formState, control } = useSettings();
  const { integration } = useIntegration();
  const postCurrentType = watch('post_type');
  const isTrialReel = watch('is_trial_reel');
  // The Audio API is only available with Facebook Login, not Instagram Login
  const supportsAudio = integration?.identifier === 'instagram';

  const selectType = useCallback(
    (value: string) => () => {
      setValue('post_type', value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  return (
    <>
      <div className="mb-[18px] p-[16px] rounded-[8px] border border-newBorder bg-newSettings">
        <div className="mb-[10px] text-[15px] font-[600]">
          {t('instagram_what_to_publish', '1 · ¿Qué vas a publicar?')}
        </div>
        {/* Sigue registrado para el resolver de class-validator; el valor
            real se cambia con los botones de abajo, no con este campo. */}
        <input type="hidden" {...register('post_type', { value: 'post' })} />
        <div className="grid grid-cols-3 gap-[8px]">
          {postType.map((item) => {
            const active = postCurrentType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={selectType(item.value)}
                className={clsx(
                  'flex flex-col items-center gap-[6px] rounded-[8px] border py-[12px] px-[8px] transition-colors',
                  active
                    ? 'bg-btnPrimary border-btnPrimary text-btnText'
                    : 'bg-newBgColorInner border-newBorder text-textItemBlur hover:text-textItemFocused'
                )}
              >
                {item.icon}
                <span className="text-[13px] font-[600]">{item.label}</span>
              </button>
            );
          })}
        </div>
        {!!typeHelp[postCurrentType] && (
          <div className="mt-[10px] text-[13px] text-textItemBlur">
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
