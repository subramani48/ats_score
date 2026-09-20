import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateStoriesDto {
  @IsString() @IsNotEmpty() @MaxLength(8000)
  resumeText!: string;

  @IsOptional() @IsInt() @Min(3) @Max(10)
  count?: number;
}

export class MatchStoryDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  question!: string;
}

export class UpdateStoryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  situation?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  task?: string;

  @IsOptional() @IsString() @MaxLength(3000)
  action?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  result?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true })
  competencies?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(200, { each: true })
  metrics?: string[];
}
