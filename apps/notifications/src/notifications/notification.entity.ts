import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { NotificationChannel, NotificationStatus } from '@repo/types';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from '@repo/types';

@Index('idx_notifications_recipient', ['recipientId'])
@Index('idx_notifications_status', ['status'])
@Index('idx_notifications_created_at', ['createdAt'])
@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({
    type: 'enum',
    enum: NOTIFICATION_CHANNELS,
    enumName: 'notification_channel_enum',
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NOTIFICATION_STATUSES,
    enumName: 'notification_status_enum',
    default: 'pending',
  })
  status: NotificationStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date | null;
}
