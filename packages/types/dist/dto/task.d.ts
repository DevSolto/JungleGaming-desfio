import { TaskPriority, TaskStatus } from "../enums/task.js";
import type { CorrelationMetadata } from "../contracts/common/correlation.js";
import { CorrelatedDto } from "./correlation.js";
export interface TaskAssigneeDTO {
    id: string;
    username: string;
    name?: string | null;
    email?: string | null;
}
export type TaskAssignee = TaskAssigneeDTO;
export interface TaskDTO {
    id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    assignees: TaskAssigneeDTO[];
    createdAt: string;
    updatedAt: string;
}
export type Task = TaskDTO;
export interface TaskActorDTO {
    id: string;
    name?: string | null;
    email?: string | null;
}
export type TaskActor = TaskActorDTO;
export declare class TaskActorDto implements TaskActorDTO {
    id: string;
    name?: string | null;
    email?: string | null;
}
export interface CreateTaskDTO {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    assignees: TaskAssigneeDTO[];
}
export type CreateTask = CreateTaskDTO;
export type UpdateTaskDTO = Partial<CreateTaskDTO> & {
    status?: TaskStatus;
    priority?: TaskPriority;
};
export type UpdateTask = UpdateTaskDTO;
export interface TaskListFiltersDTO {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    assigneeId?: string;
    dueDate?: string;
    page?: number;
    limit?: number;
}
export type TaskListFilters = TaskListFiltersDTO;
export interface PaginatedTasksDTO {
    data: TaskDTO[];
    total: number;
    page: number;
    limit: number;
}
export type PaginatedTasks = PaginatedTasksDTO;
export declare class TaskIdDto extends CorrelatedDto {
    id: string;
}
export declare class TaskIdParamDto extends TaskIdDto {
}
export declare class TaskAssigneeDto implements TaskAssigneeDTO {
    id: string;
    username: string;
    name?: string | null;
    email?: string | null;
}
export declare class CreateTaskDto implements CreateTaskDTO {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    assignees: TaskAssigneeDto[];
}
export interface CreateTaskPayloadDTO extends CreateTaskDTO, CorrelationMetadata {
    actor?: TaskActorDTO | null;
}
export declare class CreateTaskPayloadDto extends CreateTaskDto implements CreateTaskPayloadDTO {
    actor?: TaskActorDto | null;
    requestId?: string;
}
export declare class UpdateTaskDto implements UpdateTaskDTO {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignees?: TaskAssigneeDto[];
}
export interface UpdateTaskPayloadDTO extends CorrelationMetadata {
    id: string;
    data: UpdateTaskDTO;
    actor?: TaskActorDTO | null;
}
export type UpdateTaskPayload = UpdateTaskPayloadDTO;
export declare class UpdateTaskPayloadDto implements UpdateTaskPayloadDTO {
    id: string;
    data: UpdateTaskDto;
    actor?: TaskActorDto | null;
    requestId?: string;
}
export interface RemoveTaskPayloadDTO extends CorrelationMetadata {
    id: string;
    actor?: TaskActorDTO | null;
}
export declare class RemoveTaskPayloadDto extends TaskIdDto implements RemoveTaskPayloadDTO {
    actor?: TaskActorDto | null;
}
export declare class ListTasksDto extends CorrelatedDto implements TaskListFiltersDTO {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    assigneeId?: string;
    dueDate?: string;
    page?: number;
    limit?: number;
}
export declare class ListTasksQueryDto {
    page?: number;
    size?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    assigneeId?: string;
    dueDate?: string;
}
//# sourceMappingURL=task.d.ts.map