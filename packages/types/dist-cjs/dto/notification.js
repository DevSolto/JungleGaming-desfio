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
exports.ListNotificationsPayloadDto = exports.NotificationStatusUpdateDto = exports.ListNotificationsQueryDto = exports.NotificationListFiltersDto = exports.NotificationIdParamDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const notification_js_1 = require("../enums/notification.js");
class NotificationIdParamDto {
    id;
}
exports.NotificationIdParamDto = NotificationIdParamDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], NotificationIdParamDto.prototype, "id", void 0);
class NotificationListFiltersDto {
    status;
    channel;
    search;
    from;
    to;
    page;
    limit;
    taskId;
}
exports.NotificationListFiltersDto = NotificationListFiltersDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(notification_js_1.NOTIFICATION_STATUSES),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(notification_js_1.NOTIFICATION_CHANNELS),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "channel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "to", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], NotificationListFiltersDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], NotificationListFiltersDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], NotificationListFiltersDto.prototype, "taskId", void 0);
class ListNotificationsQueryDto extends NotificationListFiltersDto {
}
exports.ListNotificationsQueryDto = ListNotificationsQueryDto;
class NotificationStatusUpdateDto {
    status;
    sentAt;
}
exports.NotificationStatusUpdateDto = NotificationStatusUpdateDto;
__decorate([
    (0, class_validator_1.IsEnum)(notification_js_1.NOTIFICATION_STATUSES),
    __metadata("design:type", String)
], NotificationStatusUpdateDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], NotificationStatusUpdateDto.prototype, "sentAt", void 0);
class ListNotificationsPayloadDto extends NotificationListFiltersDto {
    recipientId;
    requestId;
}
exports.ListNotificationsPayloadDto = ListNotificationsPayloadDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ListNotificationsPayloadDto.prototype, "recipientId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, value) => value !== null),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ListNotificationsPayloadDto.prototype, "requestId", void 0);
