var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsNotEmptyObject, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested, } from "class-validator";
import { TaskPriority, TaskStatus } from "../enums/task.js";
export class TaskActorDto {
    id;
    name;
    email;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], TaskActorDto.prototype, "id", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsString(),
    __metadata("design:type", Object)
], TaskActorDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsEmail(),
    __metadata("design:type", Object)
], TaskActorDto.prototype, "email", void 0);
export class TaskIdDto {
    id;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], TaskIdDto.prototype, "id", void 0);
export class TaskIdParamDto extends TaskIdDto {
}
export class TaskAssigneeDto {
    id;
    username;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], TaskAssigneeDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], TaskAssigneeDto.prototype, "username", void 0);
export class CreateTaskDto {
    title;
    description;
    status;
    priority;
    dueDate;
    assignees;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsString(),
    __metadata("design:type", Object)
], CreateTaskDto.prototype, "description", void 0);
__decorate([
    IsEnum(TaskStatus),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "status", void 0);
__decorate([
    IsEnum(TaskPriority),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "priority", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsDateString(),
    __metadata("design:type", Object)
], CreateTaskDto.prototype, "dueDate", void 0);
__decorate([
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => TaskAssigneeDto),
    __metadata("design:type", Array)
], CreateTaskDto.prototype, "assignees", void 0);
export class CreateTaskPayloadDto extends CreateTaskDto {
    actor;
}
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    ValidateNested(),
    Type(() => TaskActorDto),
    __metadata("design:type", Object)
], CreateTaskPayloadDto.prototype, "actor", void 0);
export class UpdateTaskDto {
    title;
    description;
    status;
    priority;
    dueDate;
    assignees;
}
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsString(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    IsEnum(TaskStatus),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsEnum(TaskPriority),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "priority", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsDateString(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "dueDate", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => TaskAssigneeDto),
    __metadata("design:type", Array)
], UpdateTaskDto.prototype, "assignees", void 0);
export class UpdateTaskPayloadDTO {
    id;
    data;
    actor;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UpdateTaskPayloadDTO.prototype, "id", void 0);
__decorate([
    ValidateNested(),
    IsNotEmptyObject({ nullable: false }),
    Type(() => UpdateTaskDto),
    __metadata("design:type", UpdateTaskDto)
], UpdateTaskPayloadDto.prototype, "data", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    ValidateNested(),
    Type(() => TaskActorDto),
    __metadata("design:type", Object)
], UpdateTaskPayloadDto.prototype, "actor", void 0);
export class RemoveTaskPayloadDto extends TaskIdDto {
    actor;
}
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    ValidateNested(),
    Type(() => TaskActorDto),
    __metadata("design:type", Object)
], RemoveTaskPayloadDto.prototype, "actor", void 0);
export class ListTasksDto {
    status;
    priority;
    search;
    assigneeId;
    dueDate;
    page;
    limit;
}
__decorate([
    IsOptional(),
    IsEnum(TaskStatus),
    __metadata("design:type", String)
], ListTasksDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsEnum(TaskPriority),
    __metadata("design:type", String)
], ListTasksDto.prototype, "priority", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsUUID(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "assigneeId", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "dueDate", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTasksDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTasksDto.prototype, "limit", void 0);
export class ListTasksQueryDto {
    page;
    size;
    status;
    priority;
    search;
    dueDate;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTasksQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTasksQueryDto.prototype, "size", void 0);
__decorate([
    IsOptional(),
    IsEnum(TaskStatus),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsEnum(TaskPriority),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "priority", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "dueDate", void 0);
