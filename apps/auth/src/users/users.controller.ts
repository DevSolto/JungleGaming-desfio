import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  USERS_MESSAGE_PATTERNS,
  type UsersFindAllPayload,
  type UsersFindAllResult,
  type UsersFindByIdPayload,
  type UsersFindByIdResult,
} from '@repo/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(USERS_MESSAGE_PATTERNS.CREATE)
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.FIND_ALL)
  findAll(
    @Payload() payload: UsersFindAllPayload | undefined,
  ): Promise<UsersFindAllResult> {
    return this.usersService.findAll(payload);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.FIND_BY_ID)
  findOne(
    @Payload() payload: UsersFindByIdPayload,
  ): Promise<UsersFindByIdResult> {
    return this.usersService.findById(payload);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.UPDATE)
  update(
    @Payload()
    payload:
      | { id?: string; data?: UpdateUserDto; UpdateUserDto?: UpdateUserDto }
      | undefined,
  ) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Update payload is required');
    }

    const { id } = payload;
    const data = payload.data ?? payload.UpdateUserDto;

    if (!data) {
      throw new BadRequestException('Update data is required');
    }

    if (typeof id !== 'string') {
      throw new BadRequestException('User id is required');
    }

    return this.usersService.update(id, data);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.REMOVE)
  remove(@Payload() payload: UsersFindByIdPayload) {
    return this.usersService.remove(payload.id);
  }
}
