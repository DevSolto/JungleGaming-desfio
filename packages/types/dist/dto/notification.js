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
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateIf, } from "class-validator";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, } from "../enums/notification.js";
export class NotificationIdParamDto {
    id;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], NotificationIdParamDto.prototype, "id", void 0);
export class ListNotificationsQueryDto {
    status;
    channel;
    search;
    from;
    to;
    page;
    limit;
    taskId;
}
__decorate([
    IsOptional(),
    IsEnum(NOTIFICATION_STATUSES),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsEnum(NOTIFICATION_CHANNELS),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "channel", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsString(),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsDateString(),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "from", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsDateString(),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "to", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListNotificationsQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListNotificationsQueryDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsUUID(),
    __metadata("design:type", String)
], ListNotificationsQueryDto.prototype, "taskId", void 0);
export class NotificationStatusUpdateDto {
    status;
    sentAt;
}
__decorate([
    IsEnum(NOTIFICATION_STATUSES),
    __metadata("design:type", String)
], NotificationStatusUpdateDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    ValidateIf((_, value) => value !== null),
    IsDateString(),
    __metadata("design:type", Object)
], NotificationStatusUpdateDto.prototype, "sentAt", void 0);
