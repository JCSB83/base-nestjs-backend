import { ResponseDto } from './response.dto';
describe('ResponseDto', () => {
  it('inicializa estado cero cuando no hay datos', () => {
    const dto = new ResponseDto();
    expect(dto.statusCode).toBe(0);
    expect(dto.data).toBeUndefined();
    expect(dto.error).toBeUndefined();
  });
  it('aplica la respuesta parcial conservando el tipo y referencia de datos', () => {
    const data = { userId: 'user' };
    const dto = new ResponseDto<{ userId: string }>({
      statusCode: 200,
      logId: 'log',
      title: 'title',
      message: 'ok',
      data,
    });
    expect(dto).toEqual({
      statusCode: 200,
      logId: 'log',
      title: 'title',
      message: 'ok',
      data,
    });
    expect(dto.data).toBe(data);
  });
  it('conserva el estado predeterminado al proporcionar solo un error', () => {
    expect(new ResponseDto({ error: 'failed' })).toEqual({
      statusCode: 0,
      error: 'failed',
    });
  });
});
