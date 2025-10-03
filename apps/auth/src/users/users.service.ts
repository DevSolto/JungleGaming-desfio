import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}


  async create(createUserDto: CreateUserDto) {
    const user = this.usersRepo.create(createUserDto as Partial<User>);
    return this.usersRepo.save(user);
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
