import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateBattleCardDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  company!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  role!: string;

  @IsOptional() @IsString() @MaxLength(4000)
  jobDescription?: string;

  @IsOptional() @IsString() @MaxLength(6000)
  resumeText?: string;

  @IsOptional() @IsInt() @Min(0) @Max(50)
  experienceYears?: number;

  @IsOptional() @IsString() @MaxLength(100)
  location?: string;
}
