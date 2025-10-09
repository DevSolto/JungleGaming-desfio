import { BadRequestException, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  USERS_MESSAGE_PATTERNS,
  type UserListFilters,
  type UsersFindAllPayload,
  type UsersFindByIdPayload,
} from '@repo/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @MessagePattern(USERS_MESSAGE_PATTERNS.CREATE)
  create(@Payload() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: UsersFindAllPayload | undefined) {
    const filters = this.extractFilters(payload);
    return this.usersService.findAll(filters);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.FIND_BY_ID)
  findOne(@Payload() payload: UsersFindByIdPayload | string | undefined) {
    const id = this.extractId(payload);
    return this.usersService.findById(id);
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

    const id = this.extractId(payload);
    const data = payload.data ?? payload.UpdateUserDto;

    if (!data) {
      throw new BadRequestException('Update data is required');
    }

    return this.usersService.update(id, data);
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.REMOVE)
  remove(@Payload() payload: UsersFindByIdPayload | string | undefined) {
    const id = this.extractId(payload);
    return this.usersService.remove(id);
  }

  private extractFilters(
    payload: UsersFindAllPayload | undefined,
  ): UserListFilters {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const search =
      typeof payload.search === 'string' ? payload.search.trim() : undefined;

    return search && search.length > 0 ? { search } : {};
  }

  private extractId(
    payload:
      | UsersFindByIdPayload
      | { id?: string }
      | string
      | undefined,
  ): string {
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    if (payload && typeof payload === 'object') {
      const id = (payload as { id?: unknown }).id;
      if (typeof id === 'string') {
        const trimmed = id.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }

    throw new BadRequestException('User id is required');
  }
}
