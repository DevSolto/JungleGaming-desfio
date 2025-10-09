import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { toRpcException } from './rpc.utils';

describe('toRpcException', () => {
  it('should convert HttpException preserving status code and response body', () => {
    const httpError = new BadRequestException('invalid');

    const rpcException = toRpcException(httpError);

    expect(rpcException).toBeInstanceOf(RpcException);
    expect(rpcException.getError()).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'invalid',
    });
  });

  it('should ensure status code is present when HttpException response omits it', () => {
    const httpError = new HttpException({ message: 'missing status' }, HttpStatus.FORBIDDEN);

    const rpcException = toRpcException(httpError);

    expect(rpcException.getError()).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'missing status',
    });
  });

  it('should handle string responses from HttpException', () => {
    class CustomHttpException extends HttpException {
      constructor() {
        super('custom-error', HttpStatus.NOT_FOUND);
      }
    }

    const rpcException = toRpcException(new CustomHttpException());

    expect(rpcException.getError()).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'custom-error',
    });
  });
});
