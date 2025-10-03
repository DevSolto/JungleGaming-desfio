import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('health')
@Controller('health')
export class HealthController {

    @MessagePattern('ping')
    ping() {
        return { status: 'ok', ts: new Date().toISOString() };
    }
}