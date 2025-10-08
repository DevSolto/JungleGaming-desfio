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
exports.RefreshDto = exports.LoginDto = exports.RegisterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class RegisterDto {
    email;
    name;
    password;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "player@junglegaming.dev" }),
    (0, class_validator_1.IsEmail)({}, { message: "O email deve ser um endereço de email válido" }),
    (0, class_validator_1.IsNotEmpty)({ message: "O email é obrigatório" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Player One" }),
    (0, class_validator_1.IsString)({ message: "O nome deve ser uma string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "O nome é obrigatório" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "changeme", minLength: 6 }),
    (0, class_validator_1.IsString)({ message: "A senha deve ser uma string" }),
    (0, class_validator_1.MinLength)(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
class LoginDto {
    email;
    password;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "player@junglegaming.dev" }),
    (0, class_validator_1.IsString)({ message: "O email deve ser uma string" }),
    (0, class_validator_1.IsEmail)({}, { message: "O email deve ser um endereço de email válido" }),
    (0, class_validator_1.IsNotEmpty)({ message: "O email é obrigatório" }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "changeme", minLength: 6 }),
    (0, class_validator_1.IsString)({ message: "A senha deve ser uma string" }),
    (0, class_validator_1.MinLength)(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class RefreshDto {
    refreshToken;
}
exports.RefreshDto = RefreshDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "refresh-token" }),
    (0, class_validator_1.IsString)({ message: "O refresh token deve ser uma string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "O refresh token é obrigatório" }),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
