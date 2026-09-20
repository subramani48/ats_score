import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Everything is optional. Before this file existed the snapshot route accepted these values with no checks.
export class CreateSnapshotDto {
  @IsOptional() @IsString() @MaxLength(100)
  label?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  score?: number;

  @IsOptional() @IsString() @MaxLength(100)
  domain?: string;
}
