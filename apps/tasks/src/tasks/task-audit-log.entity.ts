import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { TaskAuditLogChangeDTO } from '@repo/types';

@Entity({ name: 'task_audit_logs' })
export class TaskAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'varchar', length: 255 })
  action: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorDisplayName?: string | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  changes?: TaskAuditLogChangeDTO[] | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
