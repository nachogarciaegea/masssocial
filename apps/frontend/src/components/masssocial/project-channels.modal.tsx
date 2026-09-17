'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  ProjectsResponse,
  ProjectView,
} from '@gitroom/frontend/components/masssocial/types';
import { ChannelPicker } from '@gitroom/frontend/components/masssocial/channel-picker.component';

export const ProjectChannelsModal: FC<{
  project: ProjectView;
  data: ProjectsResponse;
  reload: () => void;
  close: () => void;
}> = ({ project, data, reload, close }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [selected, setSelected] = useState<string[]>(
    project.integrations.map((i) => i.id)
  );
  const [loading, setLoading] = useState(false);

  const channels = useMemo(() => {
    const assigned = data.projects.flatMap((p) =>
      p.integrations.map((i) => ({
        ...i,
        subLabel:
          p.customer.id === project.customer.id
            ? t('masssocial_in_this_project', 'En este proyecto')
            : t('masssocial_in_other_project', 'En: {{name}}', {
                name: p.customer.name,
              }),
      }))
    );
    const unassigned = data.unassigned.map((i) => ({
      ...i,
      subLabel: t('masssocial_unassigned', 'Sin proyecto'),
    }));
    return [...assigned, ...unassigned];
  }, [data, project, t]);

  const save = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/masssocial/projects/${project.customer.id}/channels`,
        {
          method: 'PUT',
          body: JSON.stringify({ integrationIds: selected }),
        }
      );
      if (!response.ok) {
        throw new Error();
      }
      toaster.show(t('masssocial_channels_saved', 'Canales guardados'), 'success');
      reload();
      close();
    } catch {
      toaster.show(
        t('masssocial_channels_failed', 'No se pudieron guardar los canales'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [selected, project, fetch, reload, close, toaster, t]);

  return (
    <div className="flex flex-col gap-[12px] min-w-[320px] md:min-w-[640px]">
      <div className="text-[13px] text-textItemBlur">
        {t(
          'masssocial_channels_help',
          'Un canal solo puede pertenecer a un proyecto: si lo marcas aquí, saldrá del proyecto en el que estuviera.'
        )}
      </div>
      <ChannelPicker channels={channels} selected={selected} onChange={setSelected} />
      <div className="flex justify-end gap-[8px]">
        <Button secondary={true} onClick={close}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button loading={loading} onClick={save}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
