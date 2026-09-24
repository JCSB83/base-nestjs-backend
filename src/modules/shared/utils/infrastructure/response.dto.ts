export class ResponseDto<T = any> {
  statusCode: number = 0;
  logId?: string;
  title?: string;
  message?: string;
  error?: string;
  data?: T;

  constructor(init?: Partial<ResponseDto<T>>) {
    Object.assign(this, init);
  }
}
