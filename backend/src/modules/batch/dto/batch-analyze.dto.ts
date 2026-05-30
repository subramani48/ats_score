import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ArrayMaxSize, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class JdEntryDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title!: string;

  @IsString() @MaxLength(100)
  company?: string;

  @IsString() @IsNotEmpty() @MaxLength(4000)
  jd!: string;
}

export class BatchAnalyzeDto {
  @IsString() @IsNotEmpty() @MaxLength(6000)
  resumeText!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => JdEntryDto)
  jobDescriptions!: JdEntryDto[];

  @IsString() @IsNotEmpty() @MaxLength(100)
  domain!: string;
}
