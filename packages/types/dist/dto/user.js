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
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, } from "class-validator";
import { CorrelatedDto } from "./correlation.js";
export class ListUsersDto extends CorrelatedDto {
    search;
    page;
    limit;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListUsersDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListUsersDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListUsersDto.prototype, "limit", void 0);
export class ListUsersQueryDto {
    search;
    page;
    limit;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListUsersQueryDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListUsersQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListUsersQueryDto.prototype, "limit", void 0);
export class UserIdParamDto {
    id;
}
__decorate([
    IsUUID(),
    IsNotEmpty(),
    __metadata("design:type", String)
], UserIdParamDto.prototype, "id", void 0);
