import { Controller, Get } from '@nestjs/common';
import type { NotificationDTO } from '@contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getSampleNotification(): NotificationDTO {
    return this.appService.getSampleNotification();
  }
}
