import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@ecommerce/types';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        // If result already has our custom shape, return as-is
        if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
          return result;
        }

        let data = result;
        let meta = undefined;
        let message = 'Operation successful';

        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          data = result.data;
          meta = result.meta;
          if (result.message) message = result.message;
        }

        return {
          success: true,
          statusCode,
          message,
          data,
          meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
