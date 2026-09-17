import { ProjectsComponent } from '@gitroom/frontend/components/masssocial/projects.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `MASSSOCIAL Proyectos`,
  description: '',
};
export default async function Index() {
  return <ProjectsComponent />;
}
