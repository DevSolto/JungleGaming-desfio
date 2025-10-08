import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../tasks/task.entity';

@Entity({ name: 'task_comments' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task?: Task;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authorName?: string | null;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
