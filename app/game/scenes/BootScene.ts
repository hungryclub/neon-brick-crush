import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot-scene');
  }

  create() {
    this.scene.start('stage-scene');
  }
}
