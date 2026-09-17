// Tipos compartidos del módulo MASSSOCIAL (contrato en docs/masssocial/API.md)

export interface BulkTarget {
  integrationId: string;
  name: string;
  identifier: string;
  picture?: string;
  content: string;
  settings: Record<string, any>;
  maxLength: number;
  truncated: boolean;
}

export interface BulkMedia {
  id: string;
  path: string;
  name: string;
  thumbnail?: string;
}

export interface BulkRowPreview {
  index: number;
  date: string;
  inter?: number;
  tags: string[];
  draft: boolean;
  project?: { id: string; name: string };
  media: BulkMedia[];
  targets: BulkTarget[];
  errors: string[];
  warnings: string[];
  raw: Record<string, string>;
}

export interface BulkRowInput {
  index: number;
  fecha?: string;
  hora?: string;
  zona_horaria?: string;
  proyecto?: string;
  redes?: string;
  texto?: string;
  medios?: string;
  titulo?: string;
  tipo?: string;
  tablero?: string;
  repetir_dias?: string;
  etiquetas?: string;
  borrador?: string;
  adaptar?: string;
}

export interface ChannelView {
  id: string;
  name: string;
  identifier: string;
  picture?: string;
  disabled?: boolean;
}

export interface ProjectProfile {
  id?: string;
  customerId?: string;
  tone?: string | null;
  language?: string | null;
  hashtags?: string | null;
  timezone?: string | null;
  defaultTimes?: string | null;
  color?: string | null;
  notes?: string | null;
}

export interface ProjectView {
  customer: { id: string; name: string };
  profile: ProjectProfile | null;
  integrations: ChannelView[];
}

export interface ProjectsResponse {
  projects: ProjectView[];
  unassigned: ChannelView[];
}

export interface EvergreenPost {
  id: string;
  content: string;
  publishDate: string;
  intervalInDays: number;
  state: string;
  integration: ChannelView;
}

export interface EvergreenResponse {
  posts: EvergreenPost[];
}

export interface Adaptation {
  integrationId: string;
  identifier: string;
  content: string;
  maxLength: number;
  truncated: boolean;
  notes: string[];
}

export interface AdaptResponse {
  adaptations: Adaptation[];
}

export interface CommitResponse {
  created: { index: number; postId: string; integrationId: string }[];
  failed: { index: number; error: string }[];
}

export interface PlanRequest {
  items: { content: string; mediaIds: string[]; title?: string }[];
  integrationIds: string[];
  projectId?: string;
  start: string;
  timesOfDay: string[];
  timezone?: string;
  weekdays?: number[];
  perDay?: number;
  maxPerNetworkPerDay?: number;
  inter?: number;
  draft?: boolean;
  adapt?: boolean;
}
