import Phaser from 'phaser';

import type { IStageRuntimeConfig } from '../../domain/models/stage-model';
import createLogger from '../../shared/logging/create-logger';
import {
  createSpawnRow,
  createInitialStageBoard,
  type IStageBoardCell
} from '../entities/stage-board';
import {
  createTurnFeedbackPlan,
  type TTurnFeedbackCommand
} from '../effects/turn-feedback-emitter.js';
import {
  createStageGates,
  type IShotPathSegment,
  type IStageGate
} from '../entities/stage-gates';
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
import {
  GAME_RUNTIME_BRIDGE_REGISTRY_KEY,
  STAGE_RUNTIME_CONFIG_REGISTRY_KEY
} from '../core/runtime-registry-keys';
import { resolveTurn } from '../systems/turn-resolver';

const BALL_RADIUS = 10;
const BLOCK_WIDTH = 142;
const BLOCK_HEIGHT = 54;
const BLOCK_GAP = 12;
interface IBlockView {
  cell: IStageBoardCell;
  label: Phaser.GameObjects.Text;
  rectangle: Phaser.GameObjects.Rectangle;
}

interface IGateView {
  gate: IStageGate;
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

  private gateViews = new Map<string, IGateView>();

  private gates: IStageGate[] = [];

  private isFeverActive = false;

  private lossRow = 6;

  private lastTrackedBallPosition: { x: number; y: number } | null = null;

  private shotPathSegments: IShotPathSegment[] = [];

  private pointerIsDown = false;

  private isStageFailed = false;

  private isStageCleared = false;

  private shotState: TRuntimeShotState = 'idle';

  private turnNumber = 1;

  private destroyedBlocksThisTurn = 0;

  private stageRuntimeConfig!: IStageRuntimeConfig;

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
    const stageRuntimeConfig = this.registry.get(
      STAGE_RUNTIME_CONFIG_REGISTRY_KEY
    ) as IStageRuntimeConfig | undefined;

    if (!stageRuntimeConfig) {
      throw new Error('Stage runtime config is missing from the registry.');
    }

    this.stageRuntimeConfig = stageRuntimeConfig;

    const initialBoardState = createInitialStageBoard(stageRuntimeConfig);

    this.launcherPosition.x = width / 2;
    this.launcherPosition.y = launcherY;
    this.lossRow = resolveLossRow({
      boardTop,
      initialBoard: initialBoardState,
      launcherY
    });
    this.gates = createStageGates({
      launcherY,
      width
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

    this.renderGates();
    this.createBall();
    this.initialBoardState = cloneBoard(initialBoardState);
    this.boardState = cloneBoard(initialBoardState);
    this.renderBoard();
    this.bindInput();
    this.bindRuntimeCommands();
    this.logger.info('stage.bootstrapped', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      stageKind: this.stageRuntimeConfig.stageKind,
      stageTitle: this.stageRuntimeConfig.stageTitle
    });
    this.syncHud();
    this.time.delayedCall(0, () => {
      this.syncHud();
    });
  }

  update() {
    if (this.shotState !== 'launched') {
      return;
    }

    this.trackShotPathSegment();
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
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;

    runtimeBridge?.onStageResetRequested(() => {
      this.resetStageToBaseline();
    });
    runtimeBridge?.onFeverActivationRequested(() => {
      this.isFeverActive = true;
      this.logger.info('stage.fever_activation_requested', {
        turnNumber: this.turnNumber
      });
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

    this.shotPathSegments = [];
    this.lastTrackedBallPosition = {
      x: this.launcherPosition.x,
      y: this.launcherPosition.y
    };
    ballBody.enable = true;
    ballBody.setVelocity(shotVelocity.x, shotVelocity.y);
    this.shotState = 'launched';
    this.runtimeHud.shotState = 'launched';
    this.runtimeHud.canShoot = false;
    this.activeCollisionBlockIds.clear();
    this.logger.info('stage.turn_started', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
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
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;

    this.isStageFailed = true;
    this.pointerIsDown = false;
    this.aimGuide.clear();
    this.runtimeHud.canShoot = false;
    this.runtimeHud.shotState = 'idle';
    this.logger.warn('stage.failed', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      turnNumber: this.turnNumber,
      remainingBlocks: this.boardState.length
    });
    this.syncHud();
    runtimeBridge?.signalStageFailed();
  }

  private resetStageToBaseline() {
    const runtimeBridge = this.registry.get(
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;

    this.isStageFailed = false;
    this.isStageCleared = false;
    this.pointerIsDown = false;
    this.shotState = 'idle';
    this.turnNumber = 1;
    this.destroyedBlocksThisTurn = 0;
    this.isFeverActive = false;
    this.lastTrackedBallPosition = null;
    this.shotPathSegments = [];
    this.activeCollisionBlockIds.clear();
    this.aimGuide.clear();
    this.boardState = cloneBoard(this.initialBoardState);
    Object.assign(this.runtimeHud, createInitialRuntimeHudSnapshot());
    this.renderBoard();
    this.resetBall();
    this.logger.info('stage.retry_restored', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
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

    const runtimeBridge = this.registry.get(
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;

    this.shotState = 'resolving';
    this.runtimeHud.shotState = 'resolving';
    this.syncHud();

    const resolution = resolveTurn({
      board: this.boardState,
      feverActive: this.isFeverActive,
      gates: this.gates,
      shotPath: this.shotPathSegments,
      turnNumber: this.turnNumber,
      lossRow: this.lossRow,
      spawnRow: (turnNumber) => createSpawnRow(turnNumber, this.stageRuntimeConfig)
    });

    this.boardState = resolution.board;
    this.turnNumber = resolution.turnNumber;
    this.runtimeHud.turnNumber = resolution.turnNumber;
    this.runtimeHud.dangerLevel = resolution.dangerLevel;
    this.runtimeHud.hasReachedLossLine = resolution.hasReachedLossLine;

    this.renderBoard();
    this.resetBall();
    const feedbackPlan = createTurnFeedbackPlan({
      branch: resolution.comboBranch,
      feedbackEvents: resolution.feedbackEvents
    });
    this.playTurnFeedbackPlan(feedbackPlan.commands);
    runtimeBridge?.signalTurnResolved({
      destroyedBlocksThisTurn: this.destroyedBlocksThisTurn,
      feverApplied: resolution.feedbackEvents.some((event) => event.type === 'fever.activated'),
      gateTriggeredCount: resolution.feedbackEvents.filter((event) => event.type === 'gate.triggered')
        .length
    });

    this.logger.info('stage.turn_resolved', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      stageKind: this.stageRuntimeConfig.stageKind,
      turnNumber: this.turnNumber,
      remainingBlocks: this.boardState.length,
      destroyedBlocksThisTurn: this.destroyedBlocksThisTurn,
      comboBranch: resolution.comboBranch,
      feverApplied: resolution.feedbackEvents.some((event) => event.type === 'fever.activated'),
      hasReachedLossLine: resolution.hasReachedLossLine,
      modifierTrace: resolution.modifierTrace.map((entry) => `${entry.phase}:${entry.applied}`),
      feedbackEvents: resolution.feedbackEvents.map((event) => event.type)
    });

    this.destroyedBlocksThisTurn = 0;
    this.isFeverActive = false;
    this.lastTrackedBallPosition = null;
    this.shotPathSegments = [];
    this.shotState = 'idle';
    this.runtimeHud.shotState = 'idle';
    this.runtimeHud.destroyedBlocksThisTurn = 0;
    this.runtimeHud.canShoot = !resolution.hasReachedLossLine;
    this.syncHud();

    if (resolution.hasReachedLossLine) {
      this.handleStageFailure();
    }
  }

  private handleStageClear() {
    if (this.isStageCleared) {
      return;
    }

    const runtimeBridge = this.registry.get(
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    this.isStageCleared = true;
    this.pointerIsDown = false;
    this.shotState = 'idle';
    this.aimGuide.clear();
    ballBody.stop();
    this.runtimeHud.shotState = 'idle';
    this.runtimeHud.canShoot = false;
    this.logger.info('stage.cleared', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      turnNumber: this.turnNumber
    });
    this.syncHud();
    runtimeBridge?.signalStageCleared();
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

  private renderGates() {
    this.gateViews.forEach((gateView) => {
      gateView.rectangle.destroy();
      gateView.label.destroy();
    });
    this.gateViews.clear();

    this.gates.forEach((gate) => {
      const rectangle = this.add.rectangle(
        gate.bounds.x + gate.bounds.width / 2,
        gate.bounds.y + gate.bounds.height / 2,
        gate.bounds.width,
        gate.bounds.height,
        gate.color,
        0.2
      );
      rectangle.setStrokeStyle(2, gate.color, 0.72);

      const label = this.add.text(
        gate.bounds.x + gate.bounds.width / 2,
        gate.bounds.y + gate.bounds.height / 2,
        gate.label,
        {
          color: '#dff6ff',
          fontFamily: 'Arial Black',
          fontSize: '14px'
        }
      );
      label.setOrigin(0.5);

      this.gateViews.set(gate.id, {
        gate,
        label,
        rectangle
      });
    });
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

      if (this.boardState.length === 0) {
        this.handleStageClear();
      }

      return;
    }

    blockView.cell.hp = nextHp;
    blockView.label.setText(String(nextHp));
    blockView.rectangle.setFillStyle(resolveBlockColor(nextHp), 0.92);
  }

  private resolveBlockPosition(cell: IStageBoardCell) {
    const totalWidth =
      this.stageRuntimeConfig.boardColumns * BLOCK_WIDTH +
      (this.stageRuntimeConfig.boardColumns - 1) * BLOCK_GAP;
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

  private trackShotPathSegment() {
    const currentPoint = {
      x: this.ball.x,
      y: this.ball.y
    };

    if (!this.lastTrackedBallPosition) {
      this.lastTrackedBallPosition = currentPoint;
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.lastTrackedBallPosition.x,
      this.lastTrackedBallPosition.y,
      currentPoint.x,
      currentPoint.y
    );

    if (distance < 1) {
      return;
    }

    this.shotPathSegments.push({
      start: {
        x: this.lastTrackedBallPosition.x,
        y: this.lastTrackedBallPosition.y
      },
      end: currentPoint
    });
    this.lastTrackedBallPosition = currentPoint;
  }

  private playTurnFeedbackPlan(commands: TTurnFeedbackCommand[]) {
    commands.forEach((command) => {
      if (command.type === 'gate-pulse') {
        const gateView = this.gateViews.get(command.gateId);

        if (!gateView) {
          return;
        }

        gateView.rectangle.setFillStyle(gateView.gate.color, 0.44);
        gateView.label.setScale(1.08);
        this.time.delayedCall(160, () => {
          gateView.rectangle.setFillStyle(gateView.gate.color, 0.2);
          gateView.label.setScale(1);
        });
        return;
      }

      if (command.type === 'camera-flash') {
        this.cameras.main.flash(
          command.duration,
          command.color[0],
          command.color[1],
          command.color[2],
          false
        );
        return;
      }

      if (command.type === 'camera-shake') {
        this.cameras.main.shake(command.duration, command.intensity, false);
        return;
      }

      this.logger.info('stage.feedback_command_emitted', {
        worldId: this.stageRuntimeConfig.worldId,
        stageId: this.stageRuntimeConfig.stageId,
        commandType: command.type,
        context:
          command.type === 'sfx-cue'
            ? command.cue
            : command.type === 'haptic-pulse'
              ? command.intensity
              : null,
        turnNumber: this.turnNumber
      });
    });
  }

  private syncHud() {
    const runtimeBridge = this.registry.get(
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
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
