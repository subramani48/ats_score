import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateKeyDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  name!: string;
}

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  createKey(@Body() body: CreateKeyDto, @CurrentUser() user: AuthUser) {
    return this.service.createKey(user.id, body.name);
  }

  @Get()
  listKeys(@CurrentUser() user: AuthUser) {
    return this.service.listKeys(user.id);
  }

  @Delete(':id')
  revokeKey(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.revokeKey(user.id, id);
  }
}
