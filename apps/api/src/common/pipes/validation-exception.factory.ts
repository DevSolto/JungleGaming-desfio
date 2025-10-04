import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const fieldPath = parentPath
      ? [parentPath, error.property].filter(Boolean).join('.')
      : error.property;

    const constraintEntries = Object.entries(error.constraints ?? {});

    const formatted: ValidationErrorDetail[] = constraintEntries.map(
      ([code, message]) => ({
        field: fieldPath,
        code,
        message,
      }),
    );

    if (error.children && error.children.length > 0) {
      return [
        ...formatted,
        ...formatValidationErrors(error.children, fieldPath),
      ];
    }

    return formatted;
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const formattedErrors = formatValidationErrors(errors);

  return new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Validation failed',
    errors: formattedErrors,
  });
}
