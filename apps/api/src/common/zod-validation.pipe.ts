import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { fieldErrors } from '@folio/shared';
import type { z } from 'zod';

@Injectable()
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Check the highlighted fields.',
        fields: fieldErrors(result.error),
      });
    }
    return result.data;
  }
}
