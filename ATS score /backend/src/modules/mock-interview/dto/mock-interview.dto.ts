import { Type } from 'class-transformer';
import {
  IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class StartMockInterviewDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  role!: string;

  @IsOptional() @IsString() @MaxLength(120)
  company?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  domain!: string;

  @IsString() @IsNotEmpty() @MaxLength(6000)
  resumeText!: string;

  @IsOptional() @IsString() @MaxLength(3000)
  jobDescription?: string;

  @IsOptional() @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsOptional() @IsIn(['friendly', 'neutral', 'tough'])
  persona?: 'friendly' | 'neutral' | 'tough';

  @IsOptional() @IsInt() @Min(3) @Max(10)
  totalQuestions?: number;
}

export class DeliveryDto {
  @IsOptional() @IsNumber() @Min(0) @Max(3600)
  durationSec?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(400)
  wordsPerMinute?: number;

  @IsOptional() @IsInt() @Min(0) @Max(500)
  fillerCount?: number;
}

export class SubmitAnswerDto {
  @IsString() @IsNotEmpty() @MaxLength(4000)
  @Matches(/\S/, { message: 'answer must contain more than spaces' })   // spaces-only would cost an AI call and score 0
  answer!: string;

  @IsOptional() @ValidateNested() @Type(() => DeliveryDto)
  delivery?: DeliveryDto;
}
