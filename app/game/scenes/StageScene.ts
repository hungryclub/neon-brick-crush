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
  FEVER_COLLISION_BONUS_HIT_LIMIT,
  resolveFeverCollisionBonus,
  type TFeverMode
} from '../systems/fever-overdrive';
import {
  GAME_RUNTIME_BRIDGE_REGISTRY_KEY,
  STAGE_RUNTIME_CONFIG_REGISTRY_KEY
} from '../core/runtime-registry-keys';
import {
  createGameAudioAdapter,
  type IGameAudioAdapter
} from '../../platform/audio/game-audio.adapter.js';
import { resolveTurn } from '../systems/turn-resolver';

const BALL_RADIUS = 7;
const BLOCK_WIDTH = 142;
const BLOCK_HEIGHT = 54;
const BLOCK_GAP = 12;
const IMPACT_EFFECTS_PER_TURN_CAP = 8;
const PULSE_PREVIEW_RADIUS = (BALL_RADIUS + 18) * 3;

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

  private pulsePreviewRing!: Phaser.GameObjects.Arc;

  private blockViews = new Map<string, IBlockView>();

  private boardState: IStageBoardCell[] = [];

  private dangerLine!: Phaser.GameObjects.Rectangle;

  private gateViews = new Map<string, IGateView>();

  private gates: IStageGate[] = [];

  private neonFeedbackLayer!: INeonFeedbackLayer;

  private audioAdapter!: IGameAudioAdapter;

  private activeFeverMode: TFeverMode | null = null;

  private lossRow = 6;

  private lastTrackedBallPosition: { x: number; y: number } | null = null;

  private lastTravelDirection = new Phaser.Math.Vector2(0, -1);

  private shotPathSegments: IShotPathSegment[] = [];

  private pointerIsDown = false;

  private isStageFailed = false;

  private isStageCleared = false;

  private shotState: TRuntimeShotState = 'idle';

  private turnNumber = 1;

  private destroyedBlocksThisTurn = 0;

  private directBlockHitsThisTurn = 0;

  private impactEffectsThisTurn = 0;

  private feverCollisionBonusHitsUsed = 0;

  private stageRuntimeConfig!: IStageRuntimeConfig;

  private stagePromptLabel!: Phaser.GameObjects.Text;

  private pierceTrailLayer!: Phaser.GameObjects.Graphics;

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
    const isMobileWidth = width < 760;
    const launcherY = height - (isMobileWidth ? 72 : 86);
    const lossLineY = isMobileWidth ? height - 122 : launcherY - 98;
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
      lossLineY,
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
    if (!isMobileWidth) {
      this.add.rectangle(
        width / 2,
        launcherY + 22,
        width - 64,
        3,
        0x78e3ff,
        0.35
      );
    }

    this.dangerLine = this.add.rectangle(
      width / 2,
      lossLineY,
      width - (isMobileWidth ? 28 : 96),
      4,
      0xff4d8d,
      0.2
    );
    this.add.text(isMobileWidth ? 20 : 56, launcherY - (isMobileWidth ? 100 : 122), 'LOSS LINE', {
      color: '#ff9cc7',
      fontFamily: 'Arial',
      fontSize: isMobileWidth ? '11px' : '13px'
    });

    this.add.circle(this.launcherPosition.x, this.launcherPosition.y, 12, 0x78e3ff, 0.3);
    this.add.circle(this.launcherPosition.x, this.launcherPosition.y, BALL_RADIUS, 0xffffff, 0.88);
    this.stagePromptLabel = this.add
      .text(
        this.launcherPosition.x,
        this.launcherPosition.y + (isMobileWidth ? -26 : 28),
        resolveStagePromptText(stageRuntimeConfig, this.turnNumber, this.shotState),
        {
          color: '#c7d4ff',
          fontFamily: 'Arial',
          fontSize: isMobileWidth ? '12px' : '16px'
        }
      )
      .setOrigin(0.5, 0)
      .setVisible(!isMobileWidth);

    this.aimGuide = this.add.graphics();
    this.pierceTrailLayer = this.add.graphics().setDepth(8);
    this.neonFeedbackLayer = createNeonFeedbackLayer(this);
    this.audioAdapter = createGameAudioAdapter({
      logger: this.logger
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pierceTrailLayer.destroy();
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
      this.syncPulsePreviewRing();
      return;
    }

    this.trackShotPathSegment();
    this.releaseSeparatedBlockCollisions();
    this.syncPulsePreviewRing();

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
    runtimeBridge?.onFeverActivationRequested((mode) => {
      this.activeFeverMode = mode;
      this.feverCollisionBonusHitsUsed = 0;
      this.updateBallVisualState();
      this.logger.info('stage.fever_activation_requested', {
        mode,
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
    this.pulsePreviewRing = this.add.circle(
      this.launcherPosition.x,
      this.launcherPosition.y,
      PULSE_PREVIEW_RADIUS,
      0xff77cd,
      0.05
    );
    this.pulsePreviewRing.setStrokeStyle(2, 0xff9fd8, 0.34);
    this.pulsePreviewRing.setDepth(7);
    this.pulsePreviewRing.setVisible(false);

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
    this.updateBallVisualState();
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
    this.lastTravelDirection.set(0, -1);
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
    this.directBlockHitsThisTurn = 0;
    this.impactEffectsThisTurn = 0;
    this.feverCollisionBonusHitsUsed = 0;
    this.activeFeverMode = null;
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
        activeFeverMode: this.activeFeverMode,
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
      directBlockHitsThisTurn: this.directBlockHitsThisTurn,
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
      directBlockHitsThisTurn: this.directBlockHitsThisTurn,
      remainingBlocks: this.boardState.length,
      destroyedBlocksThisTurn: this.destroyedBlocksThisTurn,
      comboBranch: resolution.comboBranch,
      feverApplied: resolution.feedbackEvents.some((event) => event.type === 'fever.activated'),
      activeFeverMode: this.activeFeverMode,
      feverCollisionBonusHitsUsed: this.feverCollisionBonusHitsUsed,
      hasReachedLossLine: resolution.hasReachedLossLine,
      modifierTrace: resolution.modifierTrace.map((entry) => `${entry.phase}:${entry.applied}`),
      feedbackEvents: resolution.feedbackEvents.map((event) => event.type)
    });
    this.flushTurnProfile({
      turnOutcome: resolution.hasReachedLossLine ? 'failed' : 'resolved'
    });

    this.destroyedBlocksThisTurn = 0;
    this.directBlockHitsThisTurn = 0;
    this.impactEffectsThisTurn = 0;
    this.feverCollisionBonusHitsUsed = 0;
    this.activeFeverMode = null;
    this.lastTrackedBallPosition = null;
    this.shotPathSegments = [];
    this.shotState = 'idle';
    this.runtimeHud.shotState = 'idle';
    this.runtimeHud.destroyedBlocksThisTurn = 0;
    this.runtimeHud.canShoot = !resolution.hasReachedLossLine;
    this.updateBallVisualState();
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
    this.updateBallVisualState();
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
      this.physics.add.collider(
        this.ball,
        rectangle,
        () => {
          this.handleBlockHit(cell.id);
        },
        () => {
          if (this.shouldBypassBlockBounce()) {
            this.handleBlockHit(cell.id);
            return false;
          }

          return true;
        }
      );

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
    this.directBlockHitsThisTurn += 1;

    const collisionResolution = resolveFeverCollisionBonus({
      currentHp: blockView.cell.hp,
      activeFeverMode: this.activeFeverMode,
      board: this.boardState,
      hitsUsed: this.feverCollisionBonusHitsUsed,
      targetCell: blockView.cell
    });
    const nextHp = collisionResolution.nextHp;

    if (collisionResolution.bonusApplied) {
      this.feverCollisionBonusHitsUsed = collisionResolution.hitsUsed;
      this.runtimeProfiler.incrementCounter('fever_collision_bonus_hits');
      this.logger.info('stage.fever_collision_bonus_applied', {
        mode: this.activeFeverMode,
        turnNumber: this.turnNumber,
        blockId,
        hitsUsed: this.feverCollisionBonusHitsUsed,
        hitLimit: this.activeFeverMode ? FEVER_COLLISION_BONUS_HIT_LIMIT[this.activeFeverMode] : 0
      });
    }

    this.runtimeProfiler.incrementCounter('block_hit_events');
    const pulseTargetIds =
      collisionResolution.bonusApplied && this.activeFeverMode === 'pulse'
        ? this.resolvePulseBlastTargetIds(blockId)
        : [];

    if (pulseTargetIds.length > 0) {
      this.highlightPulseArea(pulseTargetIds);
      this.emitPulseBlast(blockView.rectangle);
    }

    if (collisionResolution.splashTargetIds.length > 0 || collisionResolution.chainPulseTargetIds.length > 0) {
      this.highlightPulseArea([
        ...collisionResolution.splashTargetIds,
        ...collisionResolution.chainPulseTargetIds
      ]);
    }
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

      if (collisionResolution.pierceThrough) {
        this.continuePierceTrajectory(blockView.rectangle);
      }

      return;
    }

    pulseTargetIds.forEach((targetId) => {
      this.applySplashDamage(targetId);
    });

    blockView.cell.hp = nextHp;
    blockView.label.setText(String(nextHp));
    blockView.rectangle.setFillStyle(resolveBlockColor(nextHp), 0.92);

    if (collisionResolution.pierceThrough) {
      this.continuePierceTrajectory(blockView.rectangle);
    }
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
    const horizontalPadding = isMobileWidth ? 52 : 48;
    const blockGap = isMobileWidth ? 1 : BLOCK_GAP;
    const usableWidth = Math.max(this.scale.width - horizontalPadding * 2, 240);
    const blockWidth = Math.max(
      Math.floor(
        (usableWidth - (this.stageRuntimeConfig.boardColumns - 1) * blockGap) /
          this.stageRuntimeConfig.boardColumns
      ),
      isMobileWidth ? 20 : BLOCK_WIDTH
    );
    const totalWidth =
      this.stageRuntimeConfig.boardColumns * blockWidth +
      (this.stageRuntimeConfig.boardColumns - 1) * blockGap;
    const blockHeight = Math.max(
      Math.round(blockWidth * (BLOCK_HEIGHT / BLOCK_WIDTH)),
      isMobileWidth ? 18 : BLOCK_HEIGHT
    );

    return {
      blockGap,
      blockHeight,
      blockWidth,
      boardTop: isMobileWidth ? 28 : 120,
      fontSize: Math.max(Math.round(blockHeight * 0.42), isMobileWidth ? 12 : 24),
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

    this.lastTravelDirection = new Phaser.Math.Vector2(
      currentPoint.x - this.lastTrackedBallPosition.x,
      currentPoint.y - this.lastTrackedBallPosition.y
    ).normalize();

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

  private updateBallVisualState() {
    if (!this.ball) {
      return;
    }

    if (this.activeFeverMode === 'breaker') {
      this.ball.setFillStyle(0xfff2c7, 1);
      this.ball.setStrokeStyle(3, 0xff9a54, 1);
      this.ball.setScale(1.08);
      this.pulsePreviewRing.setVisible(false);
      return;
    }

    if (this.activeFeverMode === 'pierce') {
      this.ball.setFillStyle(0xe3fbff, 1);
      this.ball.setStrokeStyle(3, 0x52d9ff, 1);
      this.ball.setScale(1.06);
      this.pulsePreviewRing.setVisible(false);
      return;
    }

    if (this.activeFeverMode === 'pulse') {
      this.ball.setFillStyle(0xffe3f3, 1);
      this.ball.setStrokeStyle(3, 0xff5db1, 1);
      this.ball.setScale(1.08);
      this.pulsePreviewRing.setVisible(true);
      this.pulsePreviewRing.setRadius(PULSE_PREVIEW_RADIUS);
      this.pulsePreviewRing.setFillStyle(0xff77cd, 0.05);
      this.pulsePreviewRing.setStrokeStyle(2, 0xff9fd8, 0.34);
      this.syncPulsePreviewRing();
      return;
    }

    this.ball.setFillStyle(0xffffff, 1);
    this.ball.setStrokeStyle(2, 0x78e3ff, 0.9);
    this.ball.setScale(1);
    this.pulsePreviewRing.setVisible(false);
  }

  private shouldBypassBlockBounce() {
    return (
      this.shotState === 'launched' &&
      this.activeFeverMode === 'pierce' &&
      this.feverCollisionBonusHitsUsed < FEVER_COLLISION_BONUS_HIT_LIMIT.pierce
    );
  }

  private continuePierceTrajectory(targetRectangle: Phaser.GameObjects.Rectangle) {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    const speed = Math.max(ballBody.velocity.length(), 420);
    const direction = this.lastTravelDirection.clone();

    if (direction.lengthSq() === 0) {
      direction.set(0, -1);
    }

    if (Math.abs(direction.y) < 0.18) {
      direction.y = direction.y >= 0 ? 0.18 : -0.18;
      direction.normalize();
    }

    const pierceOffset =
      Math.max(targetRectangle.displayWidth, targetRectangle.displayHeight) * 1.3 + BALL_RADIUS;

    this.emitPierceTrail(targetRectangle, direction);

    this.ball.setPosition(
      targetRectangle.x + direction.x * pierceOffset,
      targetRectangle.y + direction.y * pierceOffset
    );
    ballBody.reset(this.ball.x, this.ball.y);
    ballBody.setVelocity(direction.x * speed, direction.y * speed);
    this.time.delayedCall(0, () => {
      if (!ballBody.enable || this.shotState !== 'launched') {
        return;
      }

      ballBody.setVelocity(direction.x * speed, direction.y * speed);
    });
  }

  private syncPulsePreviewRing() {
    if (!this.pulsePreviewRing || !this.ball) {
      return;
    }

    this.pulsePreviewRing.setPosition(this.ball.x, this.ball.y);
  }

  private resolvePulseBlastTargetIds(targetBlockId: string) {
    const targetBlockView = this.blockViews.get(targetBlockId);

    if (!targetBlockView) {
      return [];
    }

    return [...this.blockViews.values()]
      .filter((blockView) => blockView.cell.id !== targetBlockId)
      .filter((blockView) => {
        const distance = Phaser.Math.Distance.Between(
          targetBlockView.rectangle.x,
          targetBlockView.rectangle.y,
          blockView.rectangle.x,
          blockView.rectangle.y
        );

        return distance <= PULSE_PREVIEW_RADIUS;
      })
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Between(
          targetBlockView.rectangle.x,
          targetBlockView.rectangle.y,
          left.rectangle.x,
          left.rectangle.y
        );
        const rightDistance = Phaser.Math.Distance.Between(
          targetBlockView.rectangle.x,
          targetBlockView.rectangle.y,
          right.rectangle.x,
          right.rectangle.y
        );

        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        if (right.cell.hp !== left.cell.hp) {
          return right.cell.hp - left.cell.hp;
        }

        return left.cell.id.localeCompare(right.cell.id);
      })
      .map((blockView) => blockView.cell.id);
  }

  private emitPulseBlast(targetRectangle: Phaser.GameObjects.Rectangle) {
    const ring = this.add.circle(
      targetRectangle.x,
      targetRectangle.y,
      PULSE_PREVIEW_RADIUS,
      0xff77cd,
      0.05
    );
    ring.setStrokeStyle(2, 0xffa5de, 0.48);
    ring.setDepth(9);

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 180,
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  private emitPierceTrail(
    targetRectangle: Phaser.GameObjects.Rectangle,
    direction: Phaser.Math.Vector2
  ) {
    const trailLength = Math.max(targetRectangle.displayWidth * 1.4, 96);
    const startX = targetRectangle.x - direction.x * (targetRectangle.displayWidth * 0.35);
    const startY = targetRectangle.y - direction.y * (targetRectangle.displayHeight * 0.35);
    const endX = targetRectangle.x + direction.x * trailLength;
    const endY = targetRectangle.y + direction.y * trailLength;

    this.pierceTrailLayer.clear();
    this.pierceTrailLayer.lineStyle(5, 0x52d9ff, 0.95);
    this.pierceTrailLayer.beginPath();
    this.pierceTrailLayer.moveTo(startX, startY);
    this.pierceTrailLayer.lineTo(endX, endY);
    this.pierceTrailLayer.strokePath();

    this.tweens.add({
      targets: this.pierceTrailLayer,
      alpha: 0,
      duration: 110,
      onComplete: () => {
        this.pierceTrailLayer.clear();
        this.pierceTrailLayer.setAlpha(1);
      }
    });
  }

  private highlightPulseArea(targetIds: string[]) {
    targetIds.forEach((targetId) => {
      const blockView = this.blockViews.get(targetId);

      if (!blockView) {
        return;
      }

      const highlight = this.add.rectangle(
        blockView.rectangle.x,
        blockView.rectangle.y,
        blockView.rectangle.width + 10,
        blockView.rectangle.height + 10,
        0xff77cd,
        0.22
      );
      highlight.setStrokeStyle(2, 0xffc0e8, 0.8);
      highlight.setDepth(9);

      this.tweens.add({
        targets: highlight,
        alpha: 0,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 140,
        onComplete: () => {
          highlight.destroy();
        }
      });
    });
  }

  private applySplashDamage(blockId: string) {
    const splashBlockView = this.blockViews.get(blockId);

    if (!splashBlockView) {
      return;
    }

    this.emitBlockImpactFeedback({
      x: splashBlockView.rectangle.x,
      y: splashBlockView.rectangle.y,
      destroyed: splashBlockView.cell.hp <= 1
    });

    const splashNextHp = splashBlockView.cell.hp - 1;

    if (splashNextHp <= 0) {
      splashBlockView.rectangle.destroy();
      splashBlockView.label.destroy();
      this.blockViews.delete(blockId);
      this.boardState = this.boardState.filter((cell) => cell.id !== blockId);
      this.destroyedBlocksThisTurn += 1;
      this.runtimeHud.destroyedBlocksThisTurn = this.destroyedBlocksThisTurn;
      this.runtimeHud.remainingBlocks = this.boardState.length;
      this.runtimeProfiler.incrementCounter('fever_pulse_splash_destroyed');
      this.syncHud();

      if (this.boardState.length === 0) {
        this.handleStageClear();
      }

      return;
    }

    splashBlockView.cell.hp = splashNextHp;
    splashBlockView.label.setText(String(splashNextHp));
    splashBlockView.rectangle.setFillStyle(resolveBlockColor(splashNextHp), 0.92);
    this.runtimeProfiler.incrementCounter('fever_pulse_splash_damaged');
  }

  private updateStagePrompt() {
    if (!this.stagePromptLabel) {
      return;
    }

    if (this.scale.width < 760) {
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
