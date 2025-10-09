import { TaskPriority, TaskStatus } from "../enums/task.js";
export interface TaskAssigneeDTO {
    id: string;
    username: string;
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
export declare class TaskIdDto {
    id: string;
}
export declare class TaskIdParamDto extends TaskIdDto {
}
export declare class TaskAssigneeDto implements TaskAssigneeDTO {
    id: string;
    username: string;
}
export declare class CreateTaskDto implements CreateTaskDTO {
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    assignees: TaskAssigneeDto[];
}
export interface CreateTaskPayloadDTO extends CreateTaskDTO {
    actor?: TaskActorDTO | null;
}
export declare class CreateTaskPayloadDto extends CreateTaskDto implements CreateTaskPayloadDTO {
    actor?: TaskActorDto | null;
}
export declare class UpdateTaskDto implements UpdateTaskDTO {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignees?: TaskAssigneeDto[];
}
export declare class UpdateTaskPayloadDTO {
    id: string;
    data: UpdateTaskDto;
    actor?: TaskActorDto | null;
}
export interface RemoveTaskPayloadDTO extends TaskIdDto {
    actor?: TaskActorDTO | null;
}
export declare class RemoveTaskPayloadDto extends TaskIdDto implements RemoveTaskPayloadDTO {
    actor?: TaskActorDto | null;
}
export declare class ListTasksDto implements TaskListFiltersDTO {
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
    dueDate?: string;
}
