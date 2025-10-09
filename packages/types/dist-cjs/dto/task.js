"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListTasksQueryDto = exports.ListTasksDto = exports.RemoveTaskPayloadDto = exports.UpdateTaskPayloadDto = exports.UpdateTaskDto = exports.CreateTaskPayloadDto = exports.CreateTaskDto = exports.TaskAssigneeDto = exports.TaskIdParamDto = exports.TaskIdDto = exports.TaskActorDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const task_js_1 = require("../enums/task.js");
class TaskActorDto {
    id;
    name;
    email;
}
exports.TaskActorDto = TaskActorDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TaskActorDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], TaskActorDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", Object)
], TaskActorDto.prototype, "email", void 0);
class TaskIdDto {
    id;
}
exports.TaskIdDto = TaskIdDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TaskIdDto.prototype, "id", void 0);
class TaskIdParamDto extends TaskIdDto {
}
exports.TaskIdParamDto = TaskIdParamDto;
class TaskAssigneeDto {
    id;
    username;
}
exports.TaskAssigneeDto = TaskAssigneeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TaskAssigneeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TaskAssigneeDto.prototype, "username", void 0);
class CreateTaskDto {
    title;
    description;
    status;
    priority;
    dueDate;
    assignees;
}
exports.CreateTaskDto = CreateTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(task_js_1.TaskStatus),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(task_js_1.TaskPriority),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], CreateTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TaskAssigneeDto),
    __metadata("design:type", Array)
], CreateTaskDto.prototype, "assignees", void 0);
class CreateTaskPayloadDto extends CreateTaskDto {
    actor;
}
exports.CreateTaskPayloadDto = CreateTaskPayloadDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TaskActorDto),
    __metadata("design:type", Object)
], CreateTaskPayloadDto.prototype, "actor", void 0);
class UpdateTaskDto {
    title;
    description;
    status;
    priority;
    dueDate;
    assignees;
}
exports.UpdateTaskDto = UpdateTaskDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskStatus),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskPriority),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], UpdateTaskDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => TaskAssigneeDto),
    __metadata("design:type", Array)
], UpdateTaskDto.prototype, "assignees", void 0);
class UpdateTaskPayloadDto {
    id;
    data;
    actor;
}
exports.UpdateTaskPayloadDto = UpdateTaskPayloadDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateTaskPayloadDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_validator_1.IsNotEmptyObject)({ nullable: false }),
    (0, class_transformer_1.Type)(() => UpdateTaskDto),
    __metadata("design:type", UpdateTaskDto)
], UpdateTaskPayloadDto.prototype, "data", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TaskActorDto),
    __metadata("design:type", Object)
], UpdateTaskPayloadDto.prototype, "actor", void 0);
class RemoveTaskPayloadDto extends TaskIdDto {
    actor;
}
exports.RemoveTaskPayloadDto = RemoveTaskPayloadDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TaskActorDto),
    __metadata("design:type", Object)
], RemoveTaskPayloadDto.prototype, "actor", void 0);
class ListTasksDto {
    status;
    priority;
    search;
    assigneeId;
    dueDate;
    page;
    limit;
}
exports.ListTasksDto = ListTasksDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskStatus),
    __metadata("design:type", String)
], ListTasksDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskPriority),
    __metadata("design:type", String)
], ListTasksDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListTasksDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListTasksDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListTasksDto.prototype, "limit", void 0);
class ListTasksQueryDto {
    page;
    size;
    status;
    priority;
    search;
    dueDate;
}
exports.ListTasksQueryDto = ListTasksQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListTasksQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListTasksQueryDto.prototype, "size", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskStatus),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(task_js_1.TaskPriority),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListTasksQueryDto.prototype, "dueDate", void 0);
