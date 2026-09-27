import {
  IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min,
} from 'class-validator';

export const APPLICATION_STATUSES = [
  'wishlist', 'applied', 'screening', 'interview', 'offer', 'accepted', 'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export class CreateApplicationDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  company!: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  role!: string;

  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500)
  jobUrl?: string;

  @IsOptional() @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatus;

  @IsOptional() @IsDateString()
  appliedAt?: string;

  @IsOptional() @IsDateString()
  nextStepAt?: string;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000)
  salaryOffered?: number;

  @IsOptional() @IsString() @MaxLength(3000)
  notes?: string;
}

export class UpdateApplicationDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  company?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  role?: string;

  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500)
  jobUrl?: string;

  @IsOptional() @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatus;

  @IsOptional() @IsDateString()
  appliedAt?: string;

  @IsOptional() @IsDateString()
  nextStepAt?: string;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000_000)
  salaryOffered?: number;

  @IsOptional() @IsString() @MaxLength(3000)
  notes?: string;
}

export class FollowUpDto {
  @IsIn(['thank-you', 'follow-up', 'negotiation', 'decline'])
  type!: 'thank-you' | 'follow-up' | 'negotiation' | 'decline';

  @IsOptional() @IsString() @MaxLength(120)
  interviewerName?: string;

  @IsOptional() @IsString() @MaxLength(1500)
  context?: string;
}
