import { IsString } from 'class-validator';

export class CommitReservationDto {
  @IsString()
  referenceId: string;
}
