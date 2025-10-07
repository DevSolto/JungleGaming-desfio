import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthGatewayService } from './auth-gateway.service';
import { AUTH_EMAIL_CONFLICT, AUTH_INVALID_CREDENTIALS } from '@repo/types';

function makeClientProxy(sendResult: any) {
  return {
    send: () => sendResult,
  } as any;
}

describe('AuthGatewayService error mapping', () => {
  it('should propagate status from RpcException containing HttpException', async () => {
    const httpEx = new HttpException(
      { message: 'oops' },
      HttpStatus.UNAUTHORIZED,
    );
    const client = makeClientProxy(throwError(() => new RpcException(httpEx)));
    const svc = new AuthGatewayService(client);

    await expect(
      svc.login({ email: 'a', password: 'b' } as any),
    ).rejects.toMatchObject({
      response: { message: 'oops' },
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('should propagate status from RpcException with plain error object', async () => {
    const rpcPayload = {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Invalid email or password.',
      code: AUTH_INVALID_CREDENTIALS,
    };
    const client = makeClientProxy(
      throwError(() => new RpcException(rpcPayload)),
    );
    const svc = new AuthGatewayService(client);

    await expect(
      svc.login({ email: 'a', password: 'b' } as any),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Invalid email or password.',
      }),
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('should propagate status from plain error object (non-RpcException) coming from client', async () => {
    const plain = {
      statusCode: HttpStatus.CONFLICT,
      message: 'Email address is already registered.',
      code: AUTH_EMAIL_CONFLICT,
    };
    const client = makeClientProxy(throwError(() => plain));
    const svc = new AuthGatewayService(client);

    await expect(
      svc.register({ email: 'a', password: 'b', name: 'n' } as any),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Email address is already registered.',
      }),
      status: HttpStatus.CONFLICT,
    });
  });
});
