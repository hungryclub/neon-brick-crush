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
  createNeonFeedbackLayer,
  type INeonFeedbackLayer
} from '../effects/neon-feedback-layer.js';
import {
  createRuntimeProfiler,
  type IRuntimeProfiler
} from '../perf/runtime-profiler.js';
import {
  createStageGates,
  type IShotPathSegment,
  type IStageGate
} from '../entities/stage-gates';
import {
  canStartAim,
  resolveAimPreview,
  resolveShotVelocity
} from '../mechanics/aim-shot-controller';
import {
  createInitialRuntimeDebugSnapshot,
  createInitialRuntimeHudSnapshot,
  type IGameRuntimeBridge,
  type IRuntimeDebugSnapshot,
  type IRuntimeHudSnapshot,
  type TRuntimeShotState
} from '../hud-bridges/game-runtime-bridge';
import {
  resolveLossRow,
  resolveStagePromptText
} from '../systems/stage-rule-profile';
import {
  GAME_RUNTIME_BRIDGE_REGISTRY_KEY,
  STAGE_RUNTIME_CONFIG_REGISTRY_KEY
} from '../core/runtime-registry-keys';
import {
  createGameAudioAdapter,
  type IGameAudioAdapter
} from '../../platform/audio/game-audio.adapter.js';
import { resolveTurn } from '../systems/turn-resolver';

const BALL_RADIUS = 10;
const BLOCK_WIDTH = 142;
const BLOCK_HEIGHT = 54;
const BLOCK_GAP = 12;
const IMPACT_EFFECTS_PER_TURN_CAP = 8;

interface IBoardMetrics {
  blockGap: number;
  blockHeight: number;
  blockWidth: number;
  boardTop: number;
  fontSize: number;
  startX: number;
}
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

  private readonly runtimeProfiler: IRuntimeProfiler = createRuntimeProfiler({
    logger: this.logger
  });

  private activeCollisionBlockIds = new Set<string>();

  private aimGuide!: Phaser.GameObjects.Graphics;

  private ball!: Phaser.GameObjects.Arc;

  private blockViews = new Map<string, IBlockView>();

  private boardState: IStageBoardCell[] = [];

  private dangerLine!: Phaser.GameObjects.Rectangle;

  private gateViews = new Map<string, IGateView>();

  private gates: IStageGate[] = [];

  private neonFeedbackLayer!: INeonFeedbackLayer;

  private audioAdapter!: IGameAudioAdapter;

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

  private impactEffectsThisTurn = 0;

  private stageRuntimeConfig!: IStageRuntimeConfig;

  private stagePromptLabel!: Phaser.GameObjects.Text;

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
    const launcherY = height - 86;
    const stageRuntimeConfig = this.registry.get(
      STAGE_RUNTIME_CONFIG_REGISTRY_KEY
    ) as IStageRuntimeConfig | undefined;

    if (!stageRuntimeConfig) {
      throw new Error('Stage runtime config is missing from the registry.');
    }

    this.stageRuntimeConfig = stageRuntimeConfig;

    const initialBoardState = createInitialStageBoard(stageRuntimeConfig);
    const boardMetrics = this.resolveBoardMetrics();

    this.launcherPosition.x = width / 2;
    this.launcherPosition.y = launcherY;
    this.lossRow = resolveLossRow({
      boardTop: boardMetrics.boardTop,
      blockHeight: boardMetrics.blockHeight,
      blockGap: boardMetrics.blockGap,
      initialBoard: initialBoardState,
      launcherY,
      lossRowBufferRows: stageRuntimeConfig.rulesProfile.lossRowBufferRows
    });
    this.gates = createStageGates({
      gateLayout: stageRuntimeConfig.rulesProfile.gateLayout,
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
    this.stagePromptLabel = this.add
      .text(
        this.launcherPosition.x,
        this.launcherPosition.y + 28,
        resolveStagePromptText(stageRuntimeConfig, this.turnNumber, this.shotState),
        {
          color: '#c7d4ff',
          fontFamily: 'Arial',
          fontSize: '16px'
        }
      )
      .setOrigin(0.5, 0);

    this.aimGuide = this.add.graphics();
    this.neonFeedbackLayer = createNeonFeedbackLayer(this);
    this.audioAdapter = createGameAudioAdapter({
      logger: this.logger
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.neonFeedbackLayer.destroy();
      this.audioAdapter.destroy();
    });

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
      stageTitle: this.stageRuntimeConfig.stageTitle,
      gateLayout: this.stageRuntimeConfig.rulesProfile.gateLayout,
      lossRowBufferRows: this.stageRuntimeConfig.rulesProfile.lossRowBufferRows
    });
    this.syncHud();
    this.time.delayedCall(0, () => {
      this.syncHud();
      this.updateStagePrompt();
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
      this.updateStagePrompt();
      this.syncHud();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerIsDown || this.shotState !== 'aiming') {
        return;
      }

      this.drawAimGuide(pointer);
      this.updateStagePrompt();
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
    runtimeBridge?.onForcedFailureRequested(() => {
      this.logger.warn('stage.debug_forced_failure_requested', {
        turnNumber: this.turnNumber,
        remainingBlocks: this.boardState.length
      });
      this.handleStageFailure();
    });
  }

  private canAim(pointer: Phaser.Input.Pointer) {
    if (this.shotState !== 'idle' || this.isStageFailed || this.isStageCleared) {
      return false;
    }

    return canStartAim(this.launcherPosition, pointer);
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
      this.updateStagePrompt();
      this.syncHud();
      return;
    }

    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;

    this.shotPathSegments = [];
    this.runtimeProfiler.reset();
    this.runtimeProfiler.incrementCounter('turn_started');
    this.impactEffectsThisTurn = 0;
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
    this.updateStagePrompt();
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
    this.updateStagePrompt();
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
    this.updateStagePrompt();
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
    this.impactEffectsThisTurn = 0;
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
    this.updateStagePrompt();
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

    const resolution = this.runtimeProfiler.measure('turn.resolve_ms', () =>
      resolveTurn({
        board: this.boardState,
        feverActive: this.isFeverActive,
        gates: this.gates,
        shotPath: this.shotPathSegments,
        turnNumber: this.turnNumber,
        lossRow: this.lossRow,
        spawnRow: (turnNumber) => createSpawnRow(turnNumber, this.stageRuntimeConfig)
      })
    );

    this.runtimeProfiler.incrementCounter('shot_path_segments', this.shotPathSegments.length);
    this.runtimeProfiler.incrementCounter('feedback_events', resolution.feedbackEvents.length);
    this.runtimeProfiler.incrementCounter('remaining_blocks_after_turn', resolution.board.length);

    this.runtimeProfiler.measure('turn.render_ms', () => {
      this.boardState = resolution.board;
      this.turnNumber = resolution.turnNumber;
      this.runtimeHud.turnNumber = resolution.turnNumber;
      this.runtimeHud.dangerLevel = resolution.dangerLevel;
      this.runtimeHud.hasReachedLossLine = resolution.hasReachedLossLine;

      this.renderBoard();
      this.resetBall();
    });
    const feedbackPlan = createTurnFeedbackPlan({
      branch: resolution.comboBranch,
      feedbackEvents: resolution.feedbackEvents
    });
    this.runtimeProfiler.incrementCounter('feedback_commands', feedbackPlan.commands.length);
    this.runtimeProfiler.measure('feedback.playback_ms', () => {
      this.playTurnFeedbackPlan(feedbackPlan.commands);
    });
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
    this.flushTurnProfile({
      turnOutcome: resolution.hasReachedLossLine ? 'failed' : 'resolved'
    });

    this.destroyedBlocksThisTurn = 0;
    this.impactEffectsThisTurn = 0;
    this.isFeverActive = false;
    this.lastTrackedBallPosition = null;
    this.shotPathSegments = [];
    this.shotState = 'idle';
    this.runtimeHud.shotState = 'idle';
    this.runtimeHud.destroyedBlocksThisTurn = 0;
    this.runtimeHud.canShoot = !resolution.hasReachedLossLine;
    this.updateStagePrompt();
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
    this.flushTurnProfile({
      turnOutcome: 'cleared'
    });
    this.updateStagePrompt();
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
    const boardMetrics = this.resolveBoardMetrics();

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
        boardMetrics.blockWidth,
        boardMetrics.blockHeight,
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
        fontSize: `${boardMetrics.fontSize}px`
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
    this.runtimeProfiler.incrementCounter('block_hit_events');
    this.emitBlockImpactFeedback({
      x: blockView.rectangle.x,
      y: blockView.rectangle.y,
      destroyed: nextHp <= 0
    });

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
    const boardMetrics = this.resolveBoardMetrics();
    const startY = boardMetrics.boardTop + boardMetrics.blockHeight / 2;

    return {
      x:
        boardMetrics.startX +
        cell.col * (boardMetrics.blockWidth + boardMetrics.blockGap),
      y:
        startY +
        cell.row * (boardMetrics.blockHeight + boardMetrics.blockGap)
    };
  }

  private resolveBoardMetrics(): IBoardMetrics {
    const isMobileWidth = this.scale.width < 760;
    const horizontalPadding = isMobileWidth ? 18 : 48;
    const blockGap = isMobileWidth ? 4 : BLOCK_GAP;
    const usableWidth = Math.max(this.scale.width - horizontalPadding * 2, 240);
    const blockWidth = Math.max(
      Math.floor(
        (usableWidth - (this.stageRuntimeConfig.boardColumns - 1) * blockGap) /
          this.stageRuntimeConfig.boardColumns
      ),
      isMobileWidth ? 34 : BLOCK_WIDTH
    );
    const totalWidth =
      this.stageRuntimeConfig.boardColumns * blockWidth +
      (this.stageRuntimeConfig.boardColumns - 1) * blockGap;
    const blockHeight = Math.max(
      Math.round(blockWidth * (BLOCK_HEIGHT / BLOCK_WIDTH)),
      isMobileWidth ? 24 : BLOCK_HEIGHT
    );

    return {
      blockGap,
      blockHeight,
      blockWidth,
      boardTop: isMobileWidth ? 84 : 120,
      fontSize: Math.max(Math.round(blockHeight * 0.42), isMobileWidth ? 14 : 24),
      startX: (this.scale.width - totalWidth) / 2 + blockWidth / 2
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
    this.neonFeedbackLayer.playTurnCommands(commands, {
      resolveGateTarget: (gateId) => {
        const gateView = this.gateViews.get(gateId);

        if (!gateView) {
          return null;
        }

        return {
          x: gateView.rectangle.x,
          y: gateView.rectangle.y,
          color: gateView.gate.color,
          onPulseStart: () => {
            gateView.rectangle.setFillStyle(gateView.gate.color, 0.44);
            gateView.label.setScale(1.08);
          },
          onPulseEnd: () => {
            gateView.rectangle.setFillStyle(gateView.gate.color, 0.2);
            gateView.label.setScale(1);
          }
        };
      }
    });

    commands.forEach((command) => {
      if (command.type === 'sfx-cue') {
        this.runtimeProfiler.incrementCounter(`sfx_${command.cue}`);
        this.audioAdapter.playCue(command.cue);
      }

      if (command.type === 'haptic-pulse') {
        this.runtimeProfiler.incrementCounter(`haptic_${command.intensity}`);
        this.audioAdapter.playHaptic(command.intensity);
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

  private emitBlockImpactFeedback({
    x,
    y,
    destroyed
  }: {
    x: number;
    y: number;
    destroyed: boolean;
  }) {
    const allowImpactVisual = this.impactEffectsThisTurn < IMPACT_EFFECTS_PER_TURN_CAP;

    if (allowImpactVisual) {
      this.impactEffectsThisTurn += 1;
      this.runtimeProfiler.incrementCounter('impact_visual_played');
      this.neonFeedbackLayer.playImpact({
        x,
        y,
        destroyed
      });
    } else {
      this.runtimeProfiler.incrementCounter('impact_visual_skipped');
    }

    this.audioAdapter.playCue(destroyed ? 'block-break' : 'block-hit');
    this.logger.info('stage.hit_feedback_emitted', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      turnNumber: this.turnNumber,
      destroyed,
      visualPlayed: allowImpactVisual
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

  private updateStagePrompt() {
    if (!this.stagePromptLabel) {
      return;
    }

    this.stagePromptLabel.setText(
      resolveStagePromptText(this.stageRuntimeConfig, this.turnNumber, this.shotState)
    );
  }

  private flushTurnProfile({
    turnOutcome
  }: {
    turnOutcome: 'cleared' | 'failed' | 'resolved';
  }) {
    const runtimeBridge = this.registry.get(
      GAME_RUNTIME_BRIDGE_REGISTRY_KEY
    ) as IGameRuntimeBridge | undefined;
    const runtimeDebugSnapshot: IRuntimeDebugSnapshot = createInitialRuntimeDebugSnapshot();

    runtimeDebugSnapshot.lastTurnProfile = {
      counters: { ...this.runtimeProfiler.snapshot().counters },
      impactEffectsThisTurn: this.impactEffectsThisTurn,
      pulsePool: this.neonFeedbackLayer.getPoolStats(),
      samples: { ...this.runtimeProfiler.snapshot().samples },
      turnNumber: this.turnNumber,
      turnOutcome
    };
    runtimeBridge?.signalRuntimeDebugChanged(runtimeDebugSnapshot);

    this.runtimeProfiler.flush('stage.turn_profiled', {
      worldId: this.stageRuntimeConfig.worldId,
      stageId: this.stageRuntimeConfig.stageId,
      turnNumber: this.turnNumber,
      impactEffectsThisTurn: this.impactEffectsThisTurn,
      pulsePool: this.neonFeedbackLayer.getPoolStats(),
      turnOutcome
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

function cloneBoard(board: IStageBoardCell[]) {
  return board.map((cell) => ({
    ...cell
  }));
}
