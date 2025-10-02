import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('health')
@Controller('health')
export class HealthController {

    @Get()
    @ApiOkResponse({ description: 'Healthcheck OK' })
    ping() {
        return { status: 'ok', ts: new Date().toISOString() };
    }
}