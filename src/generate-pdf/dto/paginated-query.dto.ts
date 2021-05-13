// import { Transform } from 'class-transformer';
// import { IsInt, IsOptional } from 'class-validator';

// export class PaginatedQueryDto {
//   @IsInt()
//   @IsOptional()
//   @Transform(value => value && parseInt(value, 10))
//   take?: number;

//   @IsInt()
//   @IsOptional()
//   @Transform(value => value && parseInt(value, 10))
//   skip?: number;
// }

// // https://stackoverflow.com/questions/59600411/does-nestjs-swagger-support-documentation-of-query-params-if-they-are-not-used