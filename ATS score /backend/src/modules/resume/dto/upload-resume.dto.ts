import { IsEmail, IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UploadResumeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsIn(['analyze', 'rewrite'])
  mode?: 'analyze' | 'rewrite';

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
