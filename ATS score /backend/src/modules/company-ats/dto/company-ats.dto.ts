import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CompanyAtsDto {
  @IsString() @IsNotEmpty() @MaxLength(6000)
  resumeText!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  company!: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  role!: string;
}
