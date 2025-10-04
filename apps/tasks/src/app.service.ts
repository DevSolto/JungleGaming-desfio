import { Injectable } from '@nestjs/common';
import type { TaskDTO } from '@contracts';
import { TASK_PRIORITIES, TASK_STATUSES } from '@contracts';

@Injectable()
export class AppService {
  getWelcomeTask(): TaskDTO {
    return {
      id: 'demo-task',
      title: 'Sync contracts with Jungle Gaming',
      description: 'Shared contracts keep services in sync across the monorepo.',
      priority: TASK_PRIORITIES[2],
      status: TASK_STATUSES[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
