import { Injectable } from '@nestjs/common';
import type { UserDTO, UserListFilters } from '@repo/types';

import { AuthGatewayService } from '../auth/auth-gateway.service';

@Injectable()
export class UsersService {
  constructor(private readonly authGateway: AuthGatewayService) {}

  findAll(filters: UserListFilters = {}): Promise<UserDTO[]> {
    return this.authGateway.findAllUsers(filters);
  }

  findById(id: string): Promise<UserDTO> {
    return this.authGateway.findUserById(id);
  }
}
