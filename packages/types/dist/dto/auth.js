var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
export class RegisterDto {
    email;
    name;
    password;
}
__decorate([
    ApiProperty({ example: "player@junglegaming.dev" }),
    IsEmail({}, { message: "O email deve ser um endereço de email válido" }),
    IsNotEmpty({ message: "O email é obrigatório" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    ApiProperty({ example: "Player One" }),
    IsString({ message: "O nome deve ser uma string" }),
    IsNotEmpty({ message: "O nome é obrigatório" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    ApiProperty({ example: "changeme", minLength: 6 }),
    IsString({ message: "A senha deve ser uma string" }),
    MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
export class LoginDto {
    email;
    password;
}
__decorate([
    ApiProperty({ example: "player@junglegaming.dev" }),
    IsString({ message: "O email deve ser uma string" }),
    IsEmail({}, { message: "O email deve ser um endereço de email válido" }),
    IsNotEmpty({ message: "O email é obrigatório" }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    ApiProperty({ example: "changeme", minLength: 6 }),
    IsString({ message: "A senha deve ser uma string" }),
    MinLength(6, { message: "A senha deve ter no mínimo 6 caracteres" }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
export class RefreshDto {
    refreshToken;
}
__decorate([
    ApiProperty({ example: "refresh-token" }),
    IsString({ message: "O refresh token deve ser uma string" }),
    IsNotEmpty({ message: "O refresh token é obrigatório" }),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
