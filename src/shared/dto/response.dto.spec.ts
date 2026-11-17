import { ResponseDto } from './response.dto';

describe('ResponseDto', () => {
  it('inicializa el estado por defecto sin argumentos', () => {
    expect(new ResponseDto().statusCode).toBe(0);
  });
  it('copia los valores proporcionados y preserva la referencia del dato', () => {
    const data = { id: 42 };
    const dto = new ResponseDto({ statusCode: 201, logId: '123', data });
    expect(dto).toMatchObject({ statusCode: 201, logId: '123', data });
    expect(dto.data).toBe(data);
  });
});
