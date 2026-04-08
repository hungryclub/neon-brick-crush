import Phaser from 'phaser';

export default class StageScene extends Phaser.Scene {
  constructor() {
    super('stage-scene');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x090d18, 1);
    this.add
      .text(width / 2, height / 2 - 36, 'NEON BRICK CRUSH', {
        color: '#78e3ff',
        fontFamily: 'Arial Black',
        fontSize: '34px'
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 18, 'app root scaffold is ready', {
        color: '#f5f7ff',
        fontFamily: 'Arial',
        fontSize: '20px'
      })
      .setOrigin(0.5);
  }
}
