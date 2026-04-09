export type TStageGateKind = 'spawn-clear';

export interface IStageGateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IStageGate {
  id: string;
  kind: TStageGateKind;
  label: string;
  color: number;
  bounds: IStageGateBounds;
}

export interface IShotPathSegment {
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
}

export type TShotPath = IShotPathSegment[];

export function createStageGates({
  width,
  launcherY
}: {
  width: number;
  launcherY: number;
}) {
  const gateWidth = 112;
  const gateHeight = 28;
  const gateY = Math.max(168, launcherY - 280);

  return [
    {
      id: 'gate-left-spawn-clear',
      kind: 'spawn-clear' as const,
      label: 'CLEAR',
      color: 0x78e3ff,
      bounds: {
        x: width * 0.28 - gateWidth / 2,
        y: gateY,
        width: gateWidth,
        height: gateHeight
      }
    },
    {
      id: 'gate-right-spawn-clear',
      kind: 'spawn-clear' as const,
      label: 'CLEAR',
      color: 0xff9a4d,
      bounds: {
        x: width * 0.72 - gateWidth / 2,
        y: gateY,
        width: gateWidth,
        height: gateHeight
      }
    }
  ];
}
