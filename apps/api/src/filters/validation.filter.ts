import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class ValidationException extends BadRequestException {
  public validationErrors: string[];
  constructor(errors: ValidationError[]) {
    const messages = ValidationException.getMessage(errors);
    super(messages);
    this.validationErrors = messages;
  }
  private static getMessage(errors: ValidationError[]): string[] {
    const messages: string[] = [];

    const extractMessages = (error: ValidationError, parentPath = '') => {
      const propertyPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;
      if (error.constraints) {
        messages.push(
          `${propertyPath}: ${Object.values(error.constraints).join(', ')}`,
        );
      }
      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => extractMessages(child, propertyPath));
      }
    };

    errors.forEach((error) => extractMessages(error));
    return messages;
  }
}
