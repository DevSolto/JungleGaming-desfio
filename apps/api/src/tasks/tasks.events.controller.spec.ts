import type { RmqContext } from '@nestjs/microservices';
import { AppLoggerService, runWithRequestContext } from '@repo/logger';

import { TasksEventsController } from './tasks.events.controller';
import type { TasksGateway } from './tasks.gateway';

jest.mock('@repo/logger', () => {
  const runWithRequestContext = jest.fn((_: unknown, handler: () => unknown) => handler());

  class MockAppLoggerService {
    withContext = jest.fn(() => this);
    debug = jest.fn();
    warn = jest.fn();
    error = jest.fn();
  }

  return {
    runWithRequestContext,
    AppLoggerService: MockAppLoggerService,
  };
});

describe('TasksEventsController', () => {
  let emitMock: jest.Mock;
  let ackMock: jest.Mock;
  let controller: TasksEventsController;
  let logger: AppLoggerService;

  const createContext = (headers: Record<string, unknown> = {}): RmqContext => {
    const message = {
      content: Buffer.from('event'),
      properties: { headers },
    } as unknown;

    return {
      getChannelRef: () => ({ ack: ackMock }),
      getMessage: () => message,
    } as unknown as RmqContext;
  };

  beforeEach(() => {
    emitMock = jest.fn();
    ackMock = jest.fn();
    logger = new AppLoggerService();
    controller = new TasksEventsController(
      { emitToClients: emitMock } as unknown as TasksGateway,
      logger,
    );

    (runWithRequestContext as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards task.created events with recipients and acknowledges the message', () => {
    const payload = {
      requestId: 'req-created',
      task: { id: 'task-1', assignees: [] },
      recipients: ['user-1', 'user-2'],
    };

    const context = createContext();

    controller.onTaskCreated(payload, context);

    expect(runWithRequestContext).toHaveBeenCalledTimes(1);
    expect(runWithRequestContext).toHaveBeenCalledWith(
      { requestId: 'req-created' },
      expect.any(Function),
    );
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock).toHaveBeenCalledWith('task:created', payload);
    expect(ackMock).toHaveBeenCalledTimes(1);
    expect(ackMock).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.any(Buffer) }),
    );
  });

  it('uses the request id from headers when forwarding update events without payload metadata', () => {
    const payload = {
      task: { id: 'task-2', assignees: [{ id: 'assignee-1' }] },
      recipients: ['assignee-1'],
    };

    const context = createContext({ 'x-request-id': 'header-req' });

    controller.onTaskUpdated(payload, context);

    expect(runWithRequestContext).toHaveBeenCalledTimes(1);
    expect(runWithRequestContext).toHaveBeenCalledWith(
      { requestId: 'header-req' },
      expect.any(Function),
    );
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock).toHaveBeenCalledWith('task:updated', payload);
    expect(ackMock).toHaveBeenCalledTimes(1);
    expect(ackMock).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.any(Buffer) }),
    );
  });
});
