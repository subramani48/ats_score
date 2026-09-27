import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';

export class GenerateCoverLetterDto {
  @IsString() @IsNotEmpty() @MaxLength(6000)
  resumeText!: string;

  @IsString() @IsNotEmpty() @MaxLength(3000)
  jobDescription!: string;

  @IsOptional() @IsString() @MaxLength(100)
  companyName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  role?: string;

  @IsOptional() @IsIn(['professional', 'enthusiastic', 'concise'])
  tone?: 'professional' | 'enthusiastic' | 'concise';
}
