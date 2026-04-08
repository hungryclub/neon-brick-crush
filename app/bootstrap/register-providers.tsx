import type { ReactNode } from 'react';

import { sessionActor } from '../state/machines/session.machine';

interface IRegisterProvidersProps {
  children: ReactNode;
}

let isBootstrapped = false;

export default function registerProviders(children: ReactNode) {
  if (!isBootstrapped) {
    sessionActor.start();
    isBootstrapped = true;
  }

  return <AppProviders>{children}</AppProviders>;
}

function AppProviders({ children }: IRegisterProvidersProps) {
  return <>{children}</>;
}
