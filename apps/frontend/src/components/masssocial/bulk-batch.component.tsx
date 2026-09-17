'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useMasssocialIntegrations,
  useMasssocialProjects,
} from '@gitroom/frontend/components/masssocial/hooks';
import {
  BulkMedia,
  BulkRowPreview,
  PlanRequest,
} from '@gitroom/frontend/components/masssocial/types';
import {
  Chip,
  LoadingState,
  SectionBox,
  useTimezones,
} from '@gitroom/frontend/components/masssocial/shared';
import { ChannelPicker } from '@gitroom/frontend/components/masssocial/channel-picker.component';
import { useMediaPicker } from '@gitroom/frontend/components/masssocial/media-picker';
import { PreviewTable } from '@gitroom/frontend/components/masssocial/preview-table.component';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export const BulkBatchComponent: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const timezones = useTimezones();
  const openMediaPicker = useMediaPicker();
  const { data: projectsData, isLoading: loadingProjects } = useMasssocialProjects();
  const { data: integrations, isLoading: loadingIntegrations } =
    useMasssocialIntegrations();

  const [projectId, setProjectId] = useState('');
  const [integrationIds, setIntegrationIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'media' | 'text'>('media');
  const [media, setMedia] = useState<BulkMedia[]>([]);
  const [texts, setTexts] = useState('');
  const [caption, setCaption] = useState('');
  const [start, setStart] = useState(dayjs().format('YYYY-MM-DD'));
  const [times, setTimes] = useState<string[]>(['19:00']);
  const [newTime, setNewTime] = useState('12:00');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [weekdays, setWeekdays] = useState<number[]>(WEEKDAYS);
  const [perDay, setPerDay] = useState('');
  const [maxPerNetwork, setMaxPerNetwork] = useState('');
  const [inter, setInter] = useState('');
  const [draft, setDraft] = useState(false);
  const [adapt, setAdapt] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [rows, setRows] = useState<BulkRowPreview[] | null>(null);

  const weekdayLabels = useMemo(
    () => [
      t('masssocial_wd_mon', 'L'),
      t('masssocial_wd_tue', 'M'),
      t('masssocial_wd_wed', 'X'),
      t('masssocial_wd_thu', 'J'),
      t('masssocial_wd_fri', 'V'),
      t('masssocial_wd_sat', 'S'),
      t('masssocial_wd_sun', 'D'),
    ],
    [t]
  );

  const projectOf = useMemo(() => {
    const map: Record<string, string> = {};
    projectsData?.projects?.forEach((p) =>
      p.integrations.forEach((i) => (map[i.id] = p.customer.name))
    );
    return map;
  }, [projectsData]);

  const channels = useMemo(
    () =>
      (integrations || []).map((i) => ({
        ...i,
        subLabel: projectOf[i.id] ? projectOf[i.id] : undefined,
      })),
    [integrations, projectOf]
  );

  const changeProject = useCallback(
    (id: string) => {
      setProjectId(id);
      const project = projectsData?.projects?.find((p) => p.customer.id === id);
      if (project) {
        setIntegrationIds(project.integrations.map((i) => i.id));
        if (project.profile?.timezone) {
          setTimezone(project.profile.timezone);
        }
        try {
          const defaults = project.profile?.defaultTimes
            ? (JSON.parse(project.profile.defaultTimes) as string[])
            : [];
          if (defaults.length) {
            setTimes(defaults);
          }
        } catch {
          // ignore
        }
      }
    },
    [projectsData]
  );

  const items = useMemo(() => {
    const withNumber = (value: string, n: number) =>
      value.replace(/\{n\}/g, String(n));
    if (mode === 'media') {
      return media.map((m, i) => ({
        content: withNumber(caption, i + 1),
        mediaIds: [m.id],
      }));
    }
    return texts
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, i) => ({
        content: caption.trim()
          ? `${withNumber(caption, i + 1)}\n\n${text}`
          : text,
        mediaIds: [] as string[],
      }));
  }, [mode, media, texts, caption]);

  const addTime = useCallback(() => {
    if (!newTime || times.includes(newTime)) {
      return;
    }
    setTimes([...times, newTime].sort());
  }, [newTime, times]);

  const toggleWeekday = useCallback(
    (day: number) => () => {
      setWeekdays(
        weekdays.includes(day)
          ? weekdays.filter((d) => d !== day)
          : [...weekdays, day].sort()
      );
    },
    [weekdays]
  );

  const plan = useCallback(async () => {
    if (!items.length) {
      toaster.show(
        t('masssocial_plan_no_items', 'Añade medios o textos para planificar'),
        'warning'
      );
      return;
    }
    if (!integrationIds.length) {
      toaster.show(
        t('masssocial_plan_no_channels', 'Selecciona al menos un canal'),
        'warning'
      );
      return;
    }
    if (!times.length) {
      toaster.show(
        t('masssocial_plan_no_times', 'Añade al menos una hora del día'),
        'warning'
      );
      return;
    }
    const body: PlanRequest = {
      items,
      integrationIds,
      projectId: projectId || undefined,
      start,
      timesOfDay: times,
      timezone,
      weekdays,
      perDay: perDay ? Number(perDay) : undefined,
      maxPerNetworkPerDay: maxPerNetwork ? Number(maxPerNetwork) : undefined,
      inter: inter ? Number(inter) : undefined,
      draft,
      adapt,
    };
    setPlanning(true);
    try {
      const response = await fetch('/masssocial/bulk/plan', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error();
      }
      const data: { rows: BulkRowPreview[] } = await response.json();
      setRows(data.rows || []);
    } catch {
      toaster.show(
        t('masssocial_plan_failed', 'No se pudo calcular el plan'),
        'warning'
      );
    } finally {
      setPlanning(false);
    }
  }, [
    items,
    integrationIds,
    projectId,
    start,
    times,
    timezone,
    weekdays,
    perDay,
    maxPerNetwork,
    inter,
    draft,
    adapt,
    fetch,
    toaster,
    t,
  ]);

  if (loadingProjects || loadingIntegrations) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <SectionBox title={t('masssocial_batch_targets', 'Destino')}>
        <div className="max-w-[360px]">
          <Select
            disableForm={true}
            hideErrors={true}
            label={t('masssocial_project', 'Proyecto')}
            name="project"
            value={projectId}
            onChange={(e) => changeProject(e.target.value)}
          >
            <option value="">
              {t('masssocial_no_project', 'Sin proyecto (elegir canales)')}
            </option>
            {projectsData?.projects?.map((p) => (
              <option key={p.customer.id} value={p.customer.id}>
                {p.customer.name}
              </option>
            ))}
          </Select>
        </div>
        <ChannelPicker
          channels={channels}
          selected={integrationIds}
          onChange={setIntegrationIds}
        />
      </SectionBox>

      <SectionBox title={t('masssocial_batch_content', 'Contenido')}>
        <div className="flex gap-[8px]">
          <Chip active={mode === 'media'} onClick={() => setMode('media')}>
            {t('masssocial_mode_media', 'Medios de la biblioteca')}
          </Chip>
          <Chip active={mode === 'text'} onClick={() => setMode('text')}>
            {t('masssocial_mode_text', 'Textos pegados')}
          </Chip>
        </div>
        {mode === 'media' ? (
          <div className="flex flex-col gap-[8px]">
            <div>
              <Button
                secondary={true}
                onClick={() =>
                  openMediaPicker((picked) =>
                    setMedia([
                      ...media,
                      ...picked.filter((p) => !media.some((m) => m.id === p.id)),
                    ])
                  )
                }
              >
                {t('masssocial_pick_media', 'Elegir de la mediateca')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-[8px]">
              {media.map((m, i) => (
                <div
                  key={m.id}
                  className="relative w-[72px] h-[72px] rounded-[6px] overflow-hidden bg-newTableHeader border border-newTableBorder"
                  title={m.name}
                >
                  <img
                    src={m.thumbnail || m.path}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-0 start-0 px-[4px] text-[10px] bg-newBgColorInner/80 rounded-br-[4px]">
                    {i + 1}
                  </div>
                  <div
                    onClick={() => setMedia(media.filter((x) => x.id !== m.id))}
                    className="absolute top-0 end-0 w-[18px] h-[18px] flex items-center justify-center cursor-pointer bg-newBgColorInner/80 rounded-bl-[4px] text-[12px]"
                  >
                    ×
                  </div>
                </div>
              ))}
              {!media.length && (
                <div className="text-[13px] text-textItemBlur">
                  {t(
                    'masssocial_media_help',
                    'Cada medio será una publicación. Usa {n} en el texto común para numerarlas.'
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Textarea
            disableForm={true}
            label={t(
              'masssocial_texts_label',
              'Textos (una línea en blanco separa cada publicación)'
            )}
            name="texts"
            value={texts}
            onChange={(e) => setTexts((e.target as HTMLTextAreaElement).value)}
          />
        )}
        <Textarea
          disableForm={true}
          className="!min-h-[80px]"
          label={t('masssocial_caption_label', 'Texto común (admite {n})')}
          name="caption"
          value={caption}
          onChange={(e) => setCaption((e.target as HTMLTextAreaElement).value)}
        />
        <div className="text-[12px] text-textItemBlur">
          {t('masssocial_items_count', '{{n}} publicaciones a planificar', {
            n: items.length,
          })}
        </div>
      </SectionBox>

      <SectionBox title={t('masssocial_batch_rules', 'Reglas de programación')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
          <Input
            disableForm={true}
            removeError={true}
            type="date"
            label={t('masssocial_start_date', 'Fecha de inicio')}
            name="start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Select
            disableForm={true}
            hideErrors={true}
            label={t('masssocial_timezone', 'Zona horaria')}
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-[6px]">
            <div className="text-[14px]">
              {t('masssocial_times_of_day', 'Horas del día')}
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
            <div className="flex flex-wrap gap-[6px]">
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
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">
            {t('masssocial_weekdays', 'Días de la semana')}
          </div>
          <div className="flex gap-[6px]">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                onClick={toggleWeekday(day)}
                className={clsx(
                  'w-[36px] h-[36px] rounded-full flex items-center justify-center cursor-pointer text-[13px] border select-none',
                  weekdays.includes(day)
                    ? 'bg-btnPrimary text-btnText border-btnPrimary'
                    : 'bg-newTableHeader border-newTableBorder text-newTableText hover:bg-boxHover'
                )}
              >
                {weekdayLabels[i]}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
          <Input
            disableForm={true}
            removeError={true}
            type="number"
            min={1}
            label={t('masssocial_per_day', 'Publicaciones por día')}
            name="perDay"
            placeholder={String(times.length)}
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
          />
          <Input
            disableForm={true}
            removeError={true}
            type="number"
            min={1}
            label={t('masssocial_max_per_network', 'Máximo por red y día')}
            name="maxPerNetwork"
            value={maxPerNetwork}
            onChange={(e) => setMaxPerNetwork(e.target.value)}
          />
          <Input
            disableForm={true}
            removeError={true}
            type="number"
            min={1}
            label={t('masssocial_repeat_days', 'Repetir cada N días (perenne)')}
            name="inter"
            value={inter}
            onChange={(e) => setInter(e.target.value)}
          />
        </div>

        <div className="flex gap-[24px] flex-wrap">
          <Checkbox
            disableForm={true}
            checked={draft}
            onChange={() => setDraft(!draft)}
            label={t('masssocial_as_draft', 'Guardar como borrador')}
          />
          <Checkbox
            disableForm={true}
            checked={adapt}
            onChange={() => setAdapt(!adapt)}
            label={t('masssocial_adapt_per_network', 'Adaptar texto por red')}
          />
        </div>

        <div className="flex gap-[8px]">
          <Button loading={planning} onClick={plan}>
            {t('masssocial_calculate_plan', 'Calcular plan')}
          </Button>
          {rows && (
            <Button secondary={true} onClick={() => setRows(null)}>
              {t('masssocial_clear_plan', 'Descartar plan')}
            </Button>
          )}
        </div>
      </SectionBox>

      {rows && <PreviewTable rows={rows} onRowsChange={setRows} />}
    </div>
  );
};
