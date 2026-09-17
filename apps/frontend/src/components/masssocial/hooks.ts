'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  ChannelView,
  EvergreenResponse,
  ProjectsResponse,
} from '@gitroom/frontend/components/masssocial/types';

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
};

export const useMasssocialProjects = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/masssocial/projects')).json();
  }, []);
  return useSWR<ProjectsResponse>('masssocial-projects', load, swrOptions);
};

export const useMasssocialIntegrations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json())
      .integrations as ChannelView[];
  }, []);
  return useSWR<ChannelView[]>('masssocial-integrations', load, swrOptions);
};

export const useEvergreen = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/masssocial/evergreen')).json();
  }, []);
  return useSWR<EvergreenResponse>('masssocial-evergreen', load, swrOptions);
};
