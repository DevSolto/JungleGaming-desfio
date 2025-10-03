import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}


  async create(createUserDto: CreateUserDto) {
    const { email, name, password } = createUserDto;
    const passwordHash = await this.hashPassword(password);

    const user = this.usersRepo.create({
      email,
      name,
      passwordHash,
    } as Partial<User>);
    return this.usersRepo.save(user);
  }

  private async hashPassword(password: string) {
    const rounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS', 10));
    return bcrypt.hash(password, rounds);
  }

  async findAll() {
    return this.usersRepo.find();
  }

  async findOneById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findOneByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.usersRepo.update(id, updateUserDto as Partial<User>);
    return this.findOneById(id);
  }

  async remove(id: string) {
    const user = await this.findOneById(id);
    return this.usersRepo.remove(user);
  }
}
