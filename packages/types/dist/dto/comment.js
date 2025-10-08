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
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, } from "class-validator";
// Comments are limited to 500 characters to maintain readability across clients.
export const COMMENT_MESSAGE_MAX_LENGTH = 500;
export class CreateCommentBodyDto {
    message;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(COMMENT_MESSAGE_MAX_LENGTH),
    __metadata("design:type", String)
], CreateCommentBodyDto.prototype, "message", void 0);
export class CreateCommentDto {
    taskId;
    authorId;
    message;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "taskId", void 0);
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "authorId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(COMMENT_MESSAGE_MAX_LENGTH),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "message", void 0);
export class ListTaskCommentsDto {
    taskId;
    page;
    limit;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], ListTaskCommentsDto.prototype, "taskId", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTaskCommentsDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTaskCommentsDto.prototype, "limit", void 0);
export class ListTaskCommentsQueryDto {
    page;
    limit;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTaskCommentsQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListTaskCommentsQueryDto.prototype, "limit", void 0);
