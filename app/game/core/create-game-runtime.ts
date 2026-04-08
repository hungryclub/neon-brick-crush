import Phaser from 'phaser';

import BootScene from '../scenes/BootScene';
import StageScene from '../scenes/StageScene';

interface ICreateGameRuntimeProps {
  parent: HTMLDivElement;
  onRuntimeReady: () => void;
}

export default function createGameRuntime({
  parent,
  onRuntimeReady
}: ICreateGameRuntimeProps) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent,
    backgroundColor: '#050711',
    scene: [BootScene, StageScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });

  onRuntimeReady();

  return {
    destroy() {
      game.destroy(true);
    }
  };
}
