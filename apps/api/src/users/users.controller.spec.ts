jest.mock('@repo/logger', () => ({
  getCurrentRequestContext: jest.fn(() => undefined),
}));

import { UsersController } from './users.controller';

describe('UsersController', () => {
  const createServiceMock = () => ({
    findAll: jest.fn(),
    findById: jest.fn(),
  });

  it('delega busca de usuários ao serviço normalizando filtros de pesquisa', async () => {
    const service = createServiceMock();
    const controller = new UsersController(service as any);
    const expected = [
      { id: 'user-1', name: 'Explorer 1', email: 'explorer1@example.com' },
    ];
    service.findAll.mockResolvedValue(expected);

    const response = await controller.findAll({
      search: '  explorer  ',
      page: 2,
      limit: 5,
    } as any);

    expect(service.findAll).toHaveBeenCalledWith({
      search: 'explorer',
      page: 2,
      limit: 5,
    });
    expect(response).toEqual({ data: expected });
  });

  it('mantém filtros vazios quando a busca está ausente', async () => {
    const service = createServiceMock();
    const controller = new UsersController(service as any);
    service.findAll.mockResolvedValue([]);

    const response = await controller.findAll({} as any);

    expect(service.findAll).toHaveBeenCalledWith({});
    expect(response).toEqual({ data: [] });
  });

  it('busca usuário por id através do serviço', async () => {
    const service = createServiceMock();
    const controller = new UsersController(service as any);
    const user = { id: 'user-42', name: 'Explorer 42', email: 'e42@example.com' };
    service.findById.mockResolvedValue(user);

    const response = await controller.findById({ id: 'user-42' } as any);

    expect(service.findById).toHaveBeenCalledWith('user-42');
    expect(response).toEqual({ data: user });
  });
});
