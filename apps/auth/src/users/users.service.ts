import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  type UserDTO,
  type UsersFindAllPayload,
  type UsersFindAllResult,
  type UsersFindByIdPayload,
  type UsersFindByIdResult,
} from '@repo/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 25;
  private static readonly MAX_LIMIT = 100;

  async create(createUserDto: CreateUserDto): Promise<UserDTO> {
    const { email, name, password } = createUserDto;
    const passwordHash = await this.hashPassword(password);

    const user = this.usersRepo.create({
      email,
      name,
      passwordHash,
    } as Partial<User>);
    const saved = await this.usersRepo.save(user);
    return this.toUserDto(saved);
  }

  private async hashPassword(password: string) {
    const rounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS', 10));
    return bcrypt.hash(password, rounds);
  }

  async findAll(
    payload: UsersFindAllPayload | undefined,
  ): Promise<UsersFindAllResult> {
    const filters = this.normalizeFilters(payload);
    const query = this.usersRepo.createQueryBuilder('user');

    if (filters.search) {
      query.where('user.email ILIKE :search OR user.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    query
      .orderBy('user.name', 'ASC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    const users = await query.getMany();
    return users.map((user) => this.toUserDto(user));
  }

  async findById(payload: UsersFindByIdPayload): Promise<UsersFindByIdResult>;
  async findById(id: string): Promise<UsersFindByIdResult>;
  async findById(
    input: UsersFindByIdPayload | string,
  ): Promise<UsersFindByIdResult> {
    const id = this.normalizeId(typeof input === 'string' ? input : input?.id);
    const user = await this.findEntityById(id);
    return this.toUserDto(user);
  }

  async findOneByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDTO> {
    if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('Update payload must not be empty');
    }

    const normalizedId = this.normalizeId(id);
    await this.usersRepo.update(normalizedId, updateUserDto as Partial<User>);
    return this.findById(normalizedId);
  }

  async remove(id: string): Promise<UserDTO> {
    const normalizedId = this.normalizeId(id);
    const user = await this.findEntityById(normalizedId);
    await this.usersRepo.remove(user);
    return this.toUserDto(user);
  }

  private async findEntityById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private normalizeFilters(payload: UsersFindAllPayload | undefined): {
    search?: string;
    page: number;
    limit: number;
  } {
    const search = this.normalizeSearch(payload?.search);
    const page = this.normalizePositiveInteger(
      payload?.page,
      UsersService.DEFAULT_PAGE,
    );
    const limit = this.normalizePositiveInteger(
      payload?.limit,
      UsersService.DEFAULT_LIMIT,
      UsersService.MAX_LIMIT,
    );

    return { search, page, limit };
  }

  private normalizeSearch(search: unknown): string | undefined {
    if (typeof search !== 'string') {
      return undefined;
    }

    const trimmed = search.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private normalizePositiveInteger(
    value: unknown,
    fallback: number,
    max?: number,
  ): number {
    const parsed =
      typeof value === 'number'
        ? Number.isFinite(value)
          ? Math.trunc(value)
          : NaN
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : NaN;

    let normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;

    if (max !== undefined) {
      normalized = Math.min(normalized, max);
    }

    return normalized;
  }

  private normalizeId(id: unknown): string {
    if (typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    throw new BadRequestException('User id is required');
  }

  private toUserDto(user: User): UserDTO {
    const { id, email, name } = user;
    return { id, email, name };
  }
}
