import { ApiModelProperty } from '@nestjs/swagger';

export class CreateCatDto {
  @ApiModelProperty()
  readonly name: string;

  constructor(product_id: string) {
    this.name = product_id;
  }
}
