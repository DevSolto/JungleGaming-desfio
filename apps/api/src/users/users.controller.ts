import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ListUsersQueryDto,
  type ApiResponse,
  type UserDTO,
  UserIdParamDto,
  type UserListFilters,
} from '@repo/types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'List users' })
  async findAll(
    @Query() query: ListUsersQueryDto,
  ): Promise<ApiResponse<UserDTO[]>> {
    const filters: UserListFilters = {};
    const search = query.search?.trim();

    if (search) {
      filters.search = search;
    }

    const users = await this.usersService.findAll(filters);
    return { data: users };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Retrieve a user by id' })
  async findById(
    @Param() params: UserIdParamDto,
  ): Promise<ApiResponse<UserDTO>> {
    const user = await this.usersService.findById(params.id);
    return { data: user };
  }
}
