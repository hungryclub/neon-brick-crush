import Phaser from 'phaser';

import createLogger from '../../shared/logging/create-logger';
import {
  createSpawnRow,
  createInitialStageBoard,
  type IStageBoardCell
} from '../entities/stage-board';
import {
  resolveAimPreview,
  resolveShotVelocity
} from '../mechanics/aim-shot-controller';
import {
  createInitialRuntimeHudSnapshot,
  type IGameRuntimeBridge,
  type IRuntimeHudSnapshot,
  type TRuntimeShotState
} from '../hud-bridges/game-runtime-bridge';
import { resolveTurn } from '../systems/turn-resolver';

const BALL_RADIUS = 10;
const BLOCK_WIDTH = 142;
const BLOCK_HEIGHT = 54;
const BLOCK_GAP = 12;
const BOARD_COLUMNS = 7;

interface IBlockView {
  cell: IStageBoardCell;
  label: Phaser.GameObjects.Text;
  rectangle: Phaser.GameObjects.Rectangle;
}

export default class StageScene extends Phaser.Scene {
  private initialBoardState: IStageBoardCell[] = [];

  private readonly logger = createLogger();

  private readonly runtimeHud = createInitialRuntimeHudSnapshot();

  private activeCollisionBlockIds = new Set<string>();

  private aimGuide!: Phaser.GameObjects.Graphics;

  private ball!: Phaser.GameObjects.Arc;

  private blockViews = new Map<string, IBlockView>();

  private boardState: IStageBoardCell[] = [];

  private dangerLine!: Phaser.GameObjects.Rectangle;

  private lossRow = 6;

  private pointerIsDown = false;

  private isStageFailed = false;

  private shotState: TRuntimeShotState = 'idle';

  private turnNumber = 1;

  private destroyedBlocksThisTurn = 0;

  private readonly launcherPosition = {
    x: 0,
    y: 0
  };

  constructor() {
    super('stage-scene');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const boardTop = 112;
    const launcherY = height - 86;
    const initialBoardState = createInitialStageBoard();

    this.launcherPosition.x = width / 2;
    this.launcherPosition.y = launcherY;
    this.lossRow = resolveLossRow({
      boardTop,
      initialBoard: initialBoardState,
      launcherY
    });

    this.physics.world.setBounds(0, 0, width, height);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.add.rectangle(width / 2, height / 2, width, height, 0x090d18, 1);
    this.add.rectangle(width / 2, height / 2, width, height, 0x14224c, 0.08);
    this.add.rectangle(
      width / 2,
      launcherY + 22,
      width - 64,
      3,
      0x78e3ff,
      0.35
    );

    this.dangerLine = this.add.rectangle(width / 2, launcherY - 98, width - 96, 4, 0xff4d8d, 0.2);
    this.add.text(56, launcherY - 122, 'LOSS LINE', {
      color: '#ff9cc7',
      fontFamily: 'Arial',
      fontSize: '13px'
    });

    this.add.circle(this.launcherPosition.x, this.launcherPosition.y, 16, 0x78e3ff, 0.3);
    this.add.circle(this.launcherPosition.x, this.launcherPosition.y, 8, 0xffffff, 0.88);
    this.add.text(this.launcherPosition.x, this.launcherPosition.y + 28, 'drag to aim / release to shoot', {
      color: '#c7d4ff',
      fontFamily: 'Arial',
      fontSize: '16px'
    }).setOrigin(0.5, 0);

    this.aimGuide = this.add.graphics();

    this.createBall();
    this.initialBoardState = cloneBoard(initialBoardState);
    this.boardState = cloneBoard(initialBoardState);
    this.renderBoard();
    this.bindInput();
    this.bindRuntimeCommands();
    this.syncHud();
    this.time.delayedCall(0, () => {
      this.syncHud();
    });
  }

  update() {
    if (this.shotState !== 'launched') {
      return;
    }

    this.releaseSeparatedBlockCollisions();

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    if (this.ball.y >= this.launcherPosition.y - BALL_RADIUS && ballBody.velocity.y > 0) {
      this.resolveCurrentTurn();
    }
  }

  private bindInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.canAim(pointer)) {
        return;
      }

      this.pointerIsDown = true;
      this.activeCollisionBlockIds.clear();
      this.shotState = 'aiming';
      this.drawAimGuide(pointer);
      this.syncHud();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerIsDown || this.shotState !== 'aiming') {
        return;
      }

      this.drawAimGuide(pointer);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerIsDown || this.shotState !== 'aiming') {
        return;
      }

      this.finishAim(pointer);
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerIsDown || this.shotState !== 'aiming') {
        return;
      }

      this.cancelAim(pointer);
    });
  }

  private bindRuntimeCommands() {
    const runtimeBridge = this.registry.get(
      'game-runtime-bridge'
    ) as IGameRuntimeBridge | undefined;

    runtimeBridge?.onStageResetRequested(() => {
      this.resetStageToBaseline();
    });
  }

  private canAim(pointer: Phaser.Input.Pointer) {
    if (this.shotState !== 'idle' || this.isStageFailed) {
      return false;
    }

    const launcherDistance = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.launcherPosition.x,
      this.launcherPosition.y
    );

    return launcherDistance <= 84;
  }

  private createBall() {
    this.ball = this.add.circle(
      this.launcherPosition.x,
      this.launcherPosition.y,
      BALL_RADIUS,
      0xffffff,
      1
    );
    this.ball.setStrokeStyle(2, 0x78e3ff, 0.9);

    this.physics.add.existing(this.ball);

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    ballBody.setCircle(BALL_RADIUS);
    ballBody.setAllowGravity(false);
    ballBody.setBounce(1, 1);
    ballBody.setCollideWorldBounds(true, 1, 1);
    ballBody.setImmovable(false);
    ballBody.onWorldBounds = false;

    this.resetBall();
  }

  private drawAimGuide(pointer: Phaser.Input.Pointer) {
    const preview = resolveAimPreview(this.launcherPosition, pointer);
    const guideLength = preview.distance || 1;
    const guideEndX =
      this.launcherPosition.x + Math.cos(preview.angle) * guideLength;
    const guideEndY =
      this.launcherPosition.y + Math.sin(preview.angle) * guideLength;

    this.aimGuide.clear();
    this.aimGuide.lineStyle(3, preview.isValid ? 0x78e3ff : 0xff7fc7, 0.85);
    this.aimGuide.beginPath();
    this.aimGuide.moveTo(this.launcherPosition.x, this.launcherPosition.y);
    this.aimGuide.lineTo(guideEndX, guideEndY);
    this.aimGuide.strokePath();

    this.runtimeHud.aimAngle = Phaser.Math.RadToDeg(preview.angle);
    this.runtimeHud.canShoot = preview.isValid;
    this.runtimeHud.shotState = 'aiming';
    this.syncHud();
  }

  private launchShot(pointer: Phaser.Input.Pointer) {
    const shotVelocity = resolveShotVelocity(this.launcherPosition, pointer);

    this.aimGuide.clear();
    this.runtimeHud.aimAngle = null;

    if (!shotVelocity) {
      this.shotState = 'idle';
      this.runtimeHud.shotState = 'idle';
      this.runtimeHud.canShoot = true;
      this.syncHud();
      return;
    }

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    ballBody.enable = true;
    ballBody.setVelocity(shotVelocity.x, shotVelocity.y);
    this.shotState = 'launched';
    this.runtimeHud.shotState = 'launched';
    this.runtimeHud.canShoot = false;
    this.activeCollisionBlockIds.clear();
    this.logger.info('stage.turn_started', {
      turnNumber: this.turnNumber,
      velocityX: Math.round(shotVelocity.x),
      velocityY: Math.round(shotVelocity.y)
    });
    this.syncHud();
  }

  private finishAim(pointer: Phaser.Input.Pointer) {
    this.pointerIsDown = false;
    this.launchShot(pointer);
  }

  private cancelAim(pointer: Phaser.Input.Pointer) {
    this.pointerIsDown = false;
    this.aimGuide.clear();
    this.shotState = 'idle';
    this.runtimeHud.aimAngle = null;
    this.runtimeHud.canShoot = true;
    this.runtimeHud.shotState = 'idle';
    this.logger.info('stage.aim_cancelled', {
      pointerX: Math.round(pointer.x),
      pointerY: Math.round(pointer.y),
      turnNumber: this.turnNumber
    });
    this.syncHud();
  }

  private handleStageFailure() {
    if (this.isStageFailed) {
      return;
    }

    const runtimeBridge = this.registry.get(
      'game-runtime-bridge'
    ) as IGameRuntimeBridge | undefined;

    this.isStageFailed = true;
    this.pointerIsDown = false;
    this.aimGuide.clear();
    this.runtimeHud.canShoot = false;
    this.runtimeHud.shotState = 'idle';
    this.logger.warn('stage.failed', {
      turnNumber: this.turnNumber,
      remainingBlocks: this.boardState.length
    });
    this.syncHud();
    runtimeBridge?.signalStageFailed();
  }

  private resetStageToBaseline() {
    const runtimeBridge = this.registry.get(
      'game-runtime-bridge'
    ) as IGameRuntimeBridge | undefined;

    this.isStageFailed = false;
    this.pointerIsDown = false;
    this.shotState = 'idle';
    this.turnNumber = 1;
    this.destroyedBlocksThisTurn = 0;
    this.activeCollisionBlockIds.clear();
    this.aimGuide.clear();
    this.boardState = cloneBoard(this.initialBoardState);
    Object.assign(this.runtimeHud, createInitialRuntimeHudSnapshot());
    this.renderBoard();
    this.resetBall();
    this.logger.info('stage.retry_restored', {
      turnNumber: this.turnNumber,
      remainingBlocks: this.boardState.length
    });
    this.syncHud();
    runtimeBridge?.signalStageResetCompleted();
  }

  private resolveCurrentTurn() {
    if (this.shotState !== 'launched') {
      return;
    }

    this.shotState = 'resolving';
    this.runtimeHud.shotState = 'resolving';
    this.syncHud();

    const resolution = resolveTurn({
      board: this.boardState,
      turnNumber: this.turnNumber,
      lossRow: this.lossRow,
      spawnRow: createSpawnRow
    });

    this.boardState = resolution.board;
    this.turnNumber = resolution.turnNumber;
    this.runtimeHud.turnNumber = resolution.turnNumber;
    this.runtimeHud.dangerLevel = resolution.dangerLevel;
    this.runtimeHud.hasReachedLossLine = resolution.hasReachedLossLine;

    this.renderBoard();
    this.resetBall();

    this.logger.info('stage.turn_resolved', {
      turnNumber: this.turnNumber,
      remainingBlocks: this.boardState.length,
      destroyedBlocksThisTurn: this.destroyedBlocksThisTurn,
      hasReachedLossLine: resolution.hasReachedLossLine
    });

    this.destroyedBlocksThisTurn = 0;
    this.shotState = 'idle';
    this.runtimeHud.shotState = 'idle';
    this.runtimeHud.destroyedBlocksThisTurn = 0;
    this.runtimeHud.canShoot = !resolution.hasReachedLossLine;
    this.syncHud();

    if (resolution.hasReachedLossLine) {
      this.handleStageFailure();
    }
  }

  private resetBall() {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    this.ball.setPosition(this.launcherPosition.x, this.launcherPosition.y);
    ballBody.stop();
    ballBody.reset(this.launcherPosition.x, this.launcherPosition.y);
    this.activeCollisionBlockIds.clear();
  }

  private renderBoard() {
    this.blockViews.forEach((blockView) => {
      blockView.rectangle.destroy();
      blockView.label.destroy();
    });
    this.blockViews.clear();

    this.boardState.forEach((cell) => {
      const position = this.resolveBlockPosition(cell);
      const rectangle = this.add.rectangle(
        position.x,
        position.y,
        BLOCK_WIDTH,
        BLOCK_HEIGHT,
        resolveBlockColor(cell.hp),
        0.9
      );
      rectangle.setStrokeStyle(2, 0xffffff, 0.1);
      rectangle.setData('blockId', cell.id);

      this.physics.add.existing(rectangle, true);
      this.physics.add.collider(this.ball, rectangle, () => {
        this.handleBlockHit(cell.id);
      });

      const label = this.add.text(position.x, position.y, String(cell.hp), {
        color: '#f5f7ff',
        fontFamily: 'Arial Black',
        fontSize: '24px'
      });
      label.setOrigin(0.5);

      this.blockViews.set(cell.id, {
        cell,
        label,
        rectangle
      });
    });

    this.runtimeHud.remainingBlocks = this.boardState.length;
    this.dangerLine.setFillStyle(
      this.runtimeHud.hasReachedLossLine ? 0xff5a7f : 0xff4d8d,
      this.runtimeHud.hasReachedLossLine ? 0.78 : 0.18 + this.runtimeHud.dangerLevel * 0.5
    );
    this.syncHud();
  }

  private handleBlockHit(blockId: string) {
    if (this.shotState !== 'launched') {
      return;
    }

    if (this.activeCollisionBlockIds.has(blockId)) {
      return;
    }

    const blockView = this.blockViews.get(blockId);

    if (!blockView) {
      return;
    }

    this.activeCollisionBlockIds.add(blockId);

    const nextHp = blockView.cell.hp - 1;

    if (nextHp <= 0) {
      blockView.rectangle.destroy();
      blockView.label.destroy();
      this.blockViews.delete(blockId);
      this.boardState = this.boardState.filter((cell) => cell.id !== blockId);
      this.destroyedBlocksThisTurn += 1;
      this.runtimeHud.destroyedBlocksThisTurn = this.destroyedBlocksThisTurn;
      this.runtimeHud.remainingBlocks = this.boardState.length;
      this.syncHud();
      return;
    }

    blockView.cell.hp = nextHp;
    blockView.label.setText(String(nextHp));
    blockView.rectangle.setFillStyle(resolveBlockColor(nextHp), 0.92);
  }

  private resolveBlockPosition(cell: IStageBoardCell) {
    const totalWidth =
      BOARD_COLUMNS * BLOCK_WIDTH + (BOARD_COLUMNS - 1) * BLOCK_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + BLOCK_WIDTH / 2;
    const startY = 120 + BLOCK_HEIGHT / 2;

    return {
      x: startX + cell.col * (BLOCK_WIDTH + BLOCK_GAP),
      y: startY + cell.row * (BLOCK_HEIGHT + BLOCK_GAP)
    };
  }

  private releaseSeparatedBlockCollisions() {
    const ballBounds = this.ball.getBounds();

    this.activeCollisionBlockIds.forEach((blockId) => {
      const blockView = this.blockViews.get(blockId);

      if (!blockView) {
        this.activeCollisionBlockIds.delete(blockId);
        return;
      }

      const isStillOverlapping = Phaser.Geom.Intersects.RectangleToRectangle(
        ballBounds,
        blockView.rectangle.getBounds()
      );

      if (!isStillOverlapping) {
        this.activeCollisionBlockIds.delete(blockId);
      }
    });
  }

  private syncHud() {
    const runtimeBridge = this.registry.get(
      'game-runtime-bridge'
    ) as IGameRuntimeBridge | undefined;

    if (!runtimeBridge) {
      return;
    }

    runtimeBridge.signalRuntimeHudChanged({
      ...(this.runtimeHud satisfies IRuntimeHudSnapshot)
    });
  }
}

function resolveBlockColor(hp: number) {
  if (hp >= 3) {
    return 0xff4d8d;
  }

  if (hp === 2) {
    return 0xff9a4d;
  }

  return 0x78e3ff;
}

function resolveLossRow({
  boardTop,
  initialBoard,
  launcherY
}: {
  boardTop: number;
  initialBoard: IStageBoardCell[];
  launcherY: number;
}) {
  const maxPlayableRow =
    Math.floor((launcherY - boardTop) / (BLOCK_HEIGHT + BLOCK_GAP)) - 1;
  const highestInitialRow = initialBoard.reduce((highestRow, cell) => {
    return Math.max(highestRow, cell.row);
  }, 0);

  return Math.max(maxPlayableRow, highestInitialRow + 2, 1);
}

function cloneBoard(board: IStageBoardCell[]) {
  return board.map((cell) => ({
    ...cell
  }));
}
