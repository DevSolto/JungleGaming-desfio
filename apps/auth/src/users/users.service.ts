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
import { type UserDTO, type UserListFilters } from '@repo/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}


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

  async findAll(filters: UserListFilters = {}): Promise<UserDTO[]> {
    const query = this.usersRepo.createQueryBuilder('user');

    const search = filters.search?.trim();

    if (search) {
      query.where('user.email ILIKE :search OR user.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    query.orderBy('user.name', 'ASC');

    const users = await query.getMany();
    return users.map((user) => this.toUserDto(user));
  }

  async findById(id: string): Promise<UserDTO> {
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

    await this.usersRepo.update(id, updateUserDto as Partial<User>);
    return this.findById(id);
  }

  async remove(id: string): Promise<UserDTO> {
    const user = await this.findEntityById(id);
    await this.usersRepo.remove(user);
    return this.toUserDto(user);
  }

  private async findEntityById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private toUserDto(user: User): UserDTO {
    const { id, email, name } = user;
    return { id, email, name };
  }
}
