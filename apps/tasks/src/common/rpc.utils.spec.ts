import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { toRpcException } from './rpc.utils';

describe('toRpcException', () => {
  it('should wrap HttpException with consistent payload', () => {
    const httpError = new BadRequestException('invalid');

    const rpcException = toRpcException(httpError);

    expect(rpcException).toBeInstanceOf(RpcException);
    expect(rpcException.getError()).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'invalid',
    });
  });

  it('should fallback to HttpException status when payload lacks status code', () => {
    const httpError = new HttpException({ error: 'denied' }, HttpStatus.FORBIDDEN);

    const rpcException = toRpcException(httpError);

    expect(rpcException.getError()).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'denied',
    });
  });
});
