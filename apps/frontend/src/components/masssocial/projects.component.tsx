'use client';

import { FC, useCallback, useState } from 'react';
import Link from 'next/link';
import { FormProvider, useForm } from 'react-hook-form';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useMasssocialProjects } from '@gitroom/frontend/components/masssocial/hooks';
import {
  ProjectsResponse,
  ProjectView,
} from '@gitroom/frontend/components/masssocial/types';
import {
  ChannelAvatar,
  EmptyState,
  LoadingState,
} from '@gitroom/frontend/components/masssocial/shared';
import {
  parseDefaultTimes,
  ProjectProfileModal,
} from '@gitroom/frontend/components/masssocial/project-profile.modal';
import { ProjectChannelsModal } from '@gitroom/frontend/components/masssocial/project-channels.modal';

const NewProjectModal: FC<{ reload: () => void; close: () => void }> = ({
  reload,
  close,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const form = useForm({ defaultValues: { name: '' } });

  const submit = useCallback(
    async (values: { name: string }) => {
      if (!values.name?.trim()) {
        form.setError('name', {
          message: t('masssocial_name_required', 'El nombre es obligatorio'),
        });
        return;
      }
      setLoading(true);
      try {
        const response = await fetch('/masssocial/projects', {
          method: 'POST',
          body: JSON.stringify({ name: values.name.trim() }),
        });
        if (!response.ok) {
          throw new Error();
        }
        toaster.show(t('masssocial_project_created', 'Proyecto creado'), 'success');
        reload();
        close();
      } catch {
        toaster.show(
          t('masssocial_project_failed', 'No se pudo crear el proyecto'),
          'warning'
        );
      } finally {
        setLoading(false);
      }
    },
    [fetch, reload, close, toaster, t, form]
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-[8px] min-w-[320px]"
      >
        <Input label={t('name', 'Name')} name="name" autoFocus={true} />
        <div className="flex justify-end gap-[8px]">
          <Button secondary={true} onClick={close}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('masssocial_create', 'Crear')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const ProjectCard: FC<{
  project: ProjectView;
  data: ProjectsResponse;
  reload: () => void;
}> = ({ project, data, reload }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { openModal } = useModals();
  const profile = project.profile;
  const times = parseDefaultTimes(profile?.defaultTimes);

  const editProfile = useCallback(() => {
    openModal({
      title: t('masssocial_edit_profile', 'Editar perfil'),
      closeOnEscape: true,
      children: (close) => (
        <ProjectProfileModal project={project} reload={reload} close={close} />
      ),
    });
  }, [project, reload, openModal, t]);

  const editChannels = useCallback(() => {
    openModal({
      title: t('masssocial_channels', 'Canales'),
      closeOnEscape: true,
      children: (close) => (
        <ProjectChannelsModal
          project={project}
          data={data}
          reload={reload}
          close={close}
        />
      ),
    });
  }, [project, data, reload, openModal, t]);

  const remove = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'masssocial_delete_project_confirm',
          'Se eliminará el proyecto "{{name}}" y sus canales quedarán sin proyecto. ¿Continuar?',
          { name: project.customer.name }
        )
      ))
    ) {
      return;
    }
    try {
      const response = await fetch(`/masssocial/projects/${project.customer.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error();
      }
      toaster.show(t('masssocial_project_deleted', 'Proyecto eliminado'), 'success');
      reload();
    } catch {
      toaster.show(
        t('masssocial_project_delete_failed', 'No se pudo eliminar el proyecto'),
        'warning'
      );
    }
  }, [project, fetch, reload, toaster, t]);

  const summary = [
    profile?.tone && `${t('masssocial_tone', 'Tono')}: ${profile.tone}`,
    profile?.language && `${t('masssocial_language', 'Idioma')}: ${profile.language}`,
    profile?.timezone && `${t('masssocial_timezone', 'Zona horaria')}: ${profile.timezone}`,
    times.length && `${t('masssocial_default_times', 'Horas por defecto')}: ${times.join(', ')}`,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-newTableHeader border border-newTableBorder rounded-[8px] p-[16px] flex flex-col gap-[12px]">
      <div className="flex items-center gap-[10px]">
        <div
          className="w-[12px] h-[12px] rounded-full shrink-0"
          style={{ backgroundColor: profile?.color || '#6c5ce7' }}
        />
        <div className="flex-1 text-[16px] font-[500] truncate">
          {project.customer.name}
        </div>
        <div className="text-[12px] text-textItemBlur">
          {t('masssocial_n_channels', '{{n}} canales', {
            n: project.integrations.length,
          })}
        </div>
      </div>
      <div className="flex items-center gap-[4px] min-h-[30px]">
        {project.integrations.slice(0, 8).map((channel) => (
          <ChannelAvatar key={channel.id} channel={channel} size={30} />
        ))}
        {project.integrations.length > 8 && (
          <span className="text-[12px] text-textItemBlur">
            +{project.integrations.length - 8}
          </span>
        )}
        {!project.integrations.length && (
          <span className="text-[12px] text-textItemBlur">
            {t('masssocial_no_channels_assigned', 'Sin canales asignados')}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[2px] text-[12px] text-newTableText min-h-[36px]">
        {summary.length ? (
          summary.map((line) => (
            <div key={line} className="truncate">
              {line}
            </div>
          ))
        ) : (
          <span className="text-textItemBlur">
            {t('masssocial_no_profile', 'Sin perfil configurado')}
          </span>
        )}
        {profile?.hashtags && (
          <div className="truncate text-textItemBlur" title={profile.hashtags}>
            {profile.hashtags}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-[8px] text-[12px] pt-[4px] border-t border-newTableBorder">
        <span className="cursor-pointer hover:underline" onClick={editProfile}>
          {t('masssocial_edit_profile', 'Editar perfil')}
        </span>
        <span className="cursor-pointer hover:underline" onClick={editChannels}>
          {t('masssocial_channels', 'Canales')}
        </span>
        <Link
          href={`/launches?customer=${project.customer.id}`}
          className="hover:underline"
        >
          {t('masssocial_view_calendar', 'Ver calendario')}
        </Link>
        <div className="flex-1" />
        <span className="cursor-pointer hover:underline text-red-400" onClick={remove}>
          {t('delete', 'Delete')}
        </span>
      </div>
    </div>
  );
};

export const ProjectsComponent: FC = () => {
  const t = useT();
  const { openModal } = useModals();
  const { data, isLoading, mutate } = useMasssocialProjects();

  const reload = useCallback(() => {
    mutate();
  }, [mutate]);

  const newProject = useCallback(() => {
    openModal({
      title: t('masssocial_new_project', 'Nuevo proyecto'),
      closeOnEscape: true,
      children: (close) => <NewProjectModal reload={reload} close={close} />,
    });
  }, [openModal, reload, t]);

  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[16px] min-w-0">
      <div className="flex items-center gap-[12px]">
        <div className="flex-1 text-[13px] text-textItemBlur">
          {t(
            'masssocial_projects_help',
            'Un proyecto agrupa canales y guarda un perfil (tono, idioma, hashtags, horas) que se usa al adaptar y planificar.'
          )}
        </div>
        <Button onClick={newProject}>
          {t('masssocial_new_project', 'Nuevo proyecto')}
        </Button>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && !data?.projects?.length && (
        <EmptyState text={t('masssocial_no_projects', 'Todavía no hay proyectos')} />
      )}

      {!!data?.projects?.length && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[12px]">
          {data.projects.map((project) => (
            <ProjectCard
              key={project.customer.id}
              project={project}
              data={data}
              reload={reload}
            />
          ))}
        </div>
      )}

      {!!data?.unassigned?.length && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px] font-[500]">
            {t('masssocial_unassigned_channels', 'Canales sin proyecto')} (
            {data.unassigned.length})
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {data.unassigned.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center gap-[8px] px-[10px] py-[6px] rounded-[8px] bg-newTableHeader border border-newTableBorder text-[13px]"
              >
                <ChannelAvatar channel={channel} size={24} />
                <span>{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
