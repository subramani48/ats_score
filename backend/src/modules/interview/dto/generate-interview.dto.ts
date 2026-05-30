import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';

export class GenerateInterviewDto {
  @IsString() @IsNotEmpty() @MaxLength(6000)
  resumeText!: string;

  @IsString() @IsNotEmpty() @MaxLength(3000)
  jobDescription!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  domain!: string;

  @IsOptional() @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';
}
