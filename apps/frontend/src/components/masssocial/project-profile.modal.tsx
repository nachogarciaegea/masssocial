'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { ProjectView } from '@gitroom/frontend/components/masssocial/types';
import {
  Chip,
  useTimezones,
} from '@gitroom/frontend/components/masssocial/shared';

export const parseDefaultTimes = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

const TONES = ['personal', 'professional', 'playful'];
const LANGUAGES = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ca'];

export const ProjectProfileModal: FC<{
  project: ProjectView;
  reload: () => void;
  close: () => void;
}> = ({ project, reload, close }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const timezones = useTimezones();
  const profile = project.profile;
  const [times, setTimes] = useState<string[]>(parseDefaultTimes(profile?.defaultTimes));
  const [newTime, setNewTime] = useState('19:00');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      tone: profile?.tone || '',
      language: profile?.language || 'es',
      timezone: profile?.timezone || 'Europe/Madrid',
      hashtags: profile?.hashtags || '',
      color: profile?.color || '#6c5ce7',
      notes: profile?.notes || '',
    },
  });

  const toneOptions = useMemo(() => {
    const current = profile?.tone;
    return current && !TONES.includes(current) ? [...TONES, current] : TONES;
  }, [profile?.tone]);

  const toneLabels: Record<string, string> = {
    personal: t('masssocial_tone_personal', 'Personal'),
    professional: t('masssocial_tone_professional', 'Profesional'),
    playful: t('masssocial_tone_playful', 'Desenfadado'),
  };

  const addTime = useCallback(() => {
    if (!newTime || times.includes(newTime)) {
      return;
    }
    setTimes([...times, newTime].sort());
  }, [newTime, times]);

  const submit = useCallback(
    async (values: any) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/masssocial/projects/${project.customer.id}/profile`,
          {
            method: 'PUT',
            body: JSON.stringify({
              tone: values.tone || undefined,
              language: values.language || undefined,
              timezone: values.timezone || undefined,
              hashtags: values.hashtags || undefined,
              color: values.color || undefined,
              notes: values.notes || undefined,
              defaultTimes: times,
            }),
          }
        );
        if (!response.ok) {
          throw new Error();
        }
        toaster.show(
          t('masssocial_profile_saved', 'Perfil guardado'),
          'success'
        );
        reload();
        close();
      } catch {
        toaster.show(
          t('masssocial_profile_failed', 'No se pudo guardar el perfil'),
          'warning'
        );
      } finally {
        setLoading(false);
      }
    },
    [times, project, fetch, reload, close, toaster, t]
  );

  const color = form.watch('color');

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-[8px] min-w-[320px] md:min-w-[560px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          <Select label={t('masssocial_tone', 'Tono')} name="tone">
            <option value="">{t('masssocial_not_set', 'Sin especificar')}</option>
            {toneOptions.map((tone) => (
              <option key={tone} value={tone}>
                {toneLabels[tone] || tone}
              </option>
            ))}
          </Select>
          <Select label={t('masssocial_language', 'Idioma')} name="language">
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </Select>
        </div>
        <Select label={t('masssocial_timezone', 'Zona horaria')} name="timezone">
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
        <Textarea
          className="!min-h-[80px]"
          label={t('masssocial_hashtags', 'Hashtags (separados por espacios)')}
          name="hashtags"
        />
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">
            {t('masssocial_default_times', 'Horas por defecto')}
          </div>
          <div className="flex gap-[6px] items-center">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-newBgColorInner h-[42px] px-[12px] border border-newTableBorder rounded-[8px] outline-none text-[14px]"
            />
            <Button secondary={true} onClick={addTime}>
              +
            </Button>
          </div>
          <div className="flex flex-wrap gap-[6px] min-h-[30px]">
            {times.map((time) => (
              <Chip
                key={time}
                active={true}
                onRemove={() => setTimes(times.filter((x) => x !== time))}
              >
                {time}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-[12px]">
          <input
            type="color"
            value={color || '#6c5ce7'}
            onChange={(e) => form.setValue('color', e.target.value)}
            className="w-[42px] h-[42px] rounded-[8px] border border-newTableBorder bg-newBgColorInner cursor-pointer mb-[22px]"
          />
          <div className="flex-1">
            <Input label={t('masssocial_color', 'Color')} name="color" />
          </div>
        </div>
        <Textarea
          className="!min-h-[80px]"
          label={t('masssocial_notes', 'Notas')}
          name="notes"
        />
        <div className="flex justify-end gap-[8px]">
          <Button secondary={true} onClick={close}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
